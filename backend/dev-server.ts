import app from "./index.js";

const port = Number(process.env.PORT) || 5000;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
