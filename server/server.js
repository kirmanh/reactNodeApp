import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("server is running");
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`server is runnig on port ${port}`);
});
