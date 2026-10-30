import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AccountWorkspaceGate from "./platform/AccountWorkspaceGate";
import WorkStudio from "./features/work/WorkStudio";
import { workRecordSchema, type WorkRecord } from "./features/work/model";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccountWorkspaceGate<WorkRecord> schema={workRecordSchema}>
        {(state) => <WorkStudio state={state} />}
      </AccountWorkspaceGate>
    </BrowserRouter>
  </React.StrictMode>,
);
