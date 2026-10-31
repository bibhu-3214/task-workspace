import WorkspaceLoading from "./platform/WorkspaceLoading";
import WorkspaceBoundary from "./platform/WorkspaceBoundary";
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AccountWorkspaceGate from "./platform/AccountWorkspaceGate";
const WorkStudio = lazy(() => import("./features/work/WorkStudio"));
import { workRecordSchema, type WorkRecord } from "./features/work/model";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WorkspaceBoundary>
        <AccountWorkspaceGate<WorkRecord> schema={workRecordSchema}>
          {(state) => (
            <Suspense fallback={<WorkspaceLoading />}>
              <WorkStudio state={state} />
            </Suspense>
          )}
        </AccountWorkspaceGate>
      </WorkspaceBoundary>
    </BrowserRouter>
  </React.StrictMode>,
);
