import express = require("express");
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

const tasks: Task[] = [
    { id: 1, title: "Revise COM498", priority: "high", done: false },
    { id: 2, title: "Finish CW2", priority: "medium", done: false },
];

const taskInputSchema = z.object({
    title: z.string().trim().min(1),
    priority: z.enum(["low", "medium", "high"]),
    done: z.boolean().optional(),
});

const taskUpdateSchema = taskInputSchema.partial();

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

app.post("/tasks", (req, res) => {
    const parsed = taskInputSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid task", details: parsed.error.issues });
        return;
    }

    const nextId = tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
    const task: Task = {
        id: nextId,
        title: parsed.data.title,
        priority: parsed.data.priority,
        done: parsed.data.done ?? false,
    };
    tasks.push(task);
    res.status(201).json(task);
});

app.patch("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.find((item) => item.id === id);
    if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    const parsed = taskUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Invalid task", details: parsed.error.issues });
        return;
    }

    Object.assign(task, parsed.data);
    res.json(task);
});

app.delete("/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = tasks.findIndex((item) => item.id === id);
    if (index === -1) {
        res.status(404).json({ error: "Task not found" });
        return;
    }

    const [deleted] = tasks.splice(index, 1);
    res.json(deleted);
});

const port = Number(process.env.PORT ?? 3000);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}