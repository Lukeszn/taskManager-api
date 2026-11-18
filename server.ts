import express = require("express");
import fs = require("node:fs/promises");
import path = require("node:path");
import zod = require("zod");

const { z } = zod;
const app = express();
app.use(express.json());

type Task = {
    id: number;
    title: string;
    priority: "low" | "medium" | "high";
    done: boolean;
};

let tasks: Task[] = [];

let nextId = 1;
const tasksFilePath = path.join(__dirname, "tasks.json");

const taskInputSchema = z.object({
    title: z.string().trim().min(1),
    priority: z.enum(["low", "medium", "high"]),
    done: z.boolean().optional(),
});

const UpdateTaskSchema = taskInputSchema.partial();
const storedTasksSchema = z.array(z.object({
    id: z.number().int().nonnegative(),
    title: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    done: z.boolean(),
}));

async function loadTasks(): Promise<Task[]> {
    try {
        const content = await fs.readFile(tasksFilePath, "utf8");
        return storedTasksSchema.parse(JSON.parse(content));
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

async function saveTasks(): Promise<void> {
    await fs.writeFile(tasksFilePath, JSON.stringify(tasks, null, 2), "utf8");
}

app.get("/", (_req, res) => {
    res.redirect("/tasks");
});

app.get("/tasks", (_req, res) => {
    res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.find((item) => item.id === id);

    if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    res.json(task);
});

app.post("/tasks", async (req, res) => {
    const result = taskInputSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: "Invalid task", details: result.error.issues });
        return;
    }

    const task: Task = {
        id: nextId,
        title: result.data.title,
        priority: result.data.priority,
        done: result.data.done ?? false,
    };
    tasks.push(task);
    nextId += 1;
    await saveTasks();
    res.status(201).json(task);
});

app.patch("/tasks/:id", async (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    const result = UpdateTaskSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: "Invalid task", details: result.error.issues });
        return;
    }

    const existing = tasks[index];
    if (!existing) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    const updated: Task = {
        ...existing,
        ...result.data,
        title: result.data.title ?? existing.title,
        priority: result.data.priority ?? existing.priority,
        done: result.data.done ?? existing.done,
    };
    tasks[index] = updated;
    await saveTasks();
    res.json(updated);
});

app.delete("/tasks/:id", async (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    const [deleted] = tasks.splice(index, 1);
    await saveTasks();
    res.json(deleted);
});

async function start(): Promise<void> {
    tasks = await loadTasks();
    nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;
    app.listen(3000, () => {
        console.log(`Server running with ${tasks.length} tasks`);
    });
}

start().catch((error: unknown) => {
    console.error("Failed to start server:", error);
    process.exitCode = 1;
});