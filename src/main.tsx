import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Bench } from "@/components/xuong/bench";
import "@/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Thiếu #root");

createRoot(root).render(
  <StrictMode>
    <Bench />
    <Toaster theme="dark" />
  </StrictMode>,
);
