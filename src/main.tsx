import React from "react";
import type { z } from "zod";
import type { WorkspaceRecord } from "./platform/workspaceRecords";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AccountWorkspaceGate from "./platform/AccountWorkspaceGate";
import WorkspaceDashboard from "./platform/WorkspaceDashboard";
import { schemas, kindSchema } from "./platform/workspaceRecords";
import product from "../product.json";
import "./styles.css";
const schema: z.ZodType<WorkspaceRecord> =
  schemas[kindSchema.parse(product.kind)];
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccountWorkspaceGate<WorkspaceRecord> schema={schema}>
        {(state) => <WorkspaceDashboard state={state} />}
      </AccountWorkspaceGate>
    </BrowserRouter>
  </React.StrictMode>,
);
