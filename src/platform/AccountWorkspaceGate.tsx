import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { z } from "zod";
import {
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LogOut,
  LockKeyhole,
} from "lucide-react";
import {
  accountChannel,
  authenticate,
  message,
  request,
  restoreSession,
  signOut,
  workspaceSchema,
} from "./workspaceApi";
import type { Account } from "./workspaceApi";
import { Button, Input, Modal } from "./ui";
import product from "../../product.json";
import { getLocalCredentials } from "./localCredentials";
export interface WorkspaceState<T> {
  account: Account;
  records: T[];
  revision: number;
  save: (records: T[]) => Promise<void>;
  reload: () => void;
  busy: boolean;
}
export default function AccountWorkspaceGate<T>({
  schema,
  children,
}: {
  schema: z.ZodType<T>;
  children: (state: WorkspaceState<T>) => ReactNode;
}) {
  const [account, setAccount] = useState<Account | null>(null),
    [restoring, setRestoring] = useState(true),
    [records, setRecords] = useState<T[]>([]),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [register, setRegister] = useState(false),
    [settings, setSettings] = useState(false),
    [notice, setNotice] = useState(""),
    [loadId, setLoadId] = useState(0);
  const localCredentials = getLocalCredentials();
  const epoch = useRef(0),
    expected = useRef(0);
  const envelope = workspaceSchema(schema);
  async function load() {
    const current = ++epoch.current;
    setRestoring(true);
    setAccount(null);
    setRecords([]);
    expected.current = 0;
    setRevision(0);
    setError("");
    try {
      const user = await restoreSession();
      if (current !== epoch.current) return;
      if (user) {
        const state = envelope.parse(await request("workspace"));
        if (current !== epoch.current) return;
        setRecords(state.records);
        setAccount(user);
        expected.current = state.revision;
        setRevision(state.revision);
        setLoadId((value) => value + 1);
      }
    } catch (error) {
      if (current === epoch.current) setError(message(error));
    } finally {
      if (current === epoch.current) setRestoring(false);
    }
  }
  const initialLoad = useRef(load);
  useEffect(() => {
    const invalidate = () => {
      epoch.current++;
    };
    void initialLoad.current();
    const expired = () => {
      epoch.current++;
      setAccount(null);
      setRecords([]);
      setError("Your session ended. Sign in again.");
      setRestoring(false);
    };
    let channel: BroadcastChannel | undefined;
    try {
      if (typeof window.BroadcastChannel === "function") {
        channel = new window.BroadcastChannel(accountChannel);
        channel.onmessage = (event: MessageEvent<unknown>) => {
          if (event.data === "changed") void initialLoad.current();
        };
      }
    } catch {
      /* Reconnect still verifies sessions when channels are unavailable. */
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.key === accountChannel) void initialLoad.current();
    };
    window.addEventListener("storage", storageChanged);
    window.addEventListener("workspace:expired", expired);
    return () => {
      invalidate();
      channel?.close();
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("workspace:expired", expired);
    };
  }, []);
  async function save(next: T[]) {
    const current = epoch.current;
    setBusy(true);
    setError("");
    try {
      const state = envelope.parse(
        await request("workspace", "PUT", {
          revision: expected.current,
          records: next,
        }),
      );
      if (current !== epoch.current)
        throw new Error("This session changed. Reload before continuing.");
      expected.current = state.revision;
      setRevision(state.revision);
      setRecords(state.records);
    } catch (error) {
      setError(message(error));
      throw error;
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await authenticate(register ? "register" : "login", {
        email: String(data.get("email") || ""),
        password: String(data.get("password") || ""),
        ...(register ? { name: String(data.get("name") || "") } : {}),
      });
      await load();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  if (restoring)
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-6 text-muted">
        <div role="status" className="text-center">
          <RefreshCw className="mx-auto mb-4 animate-spin motion-reduce:animate-none" />
          Opening {product.title}…
        </div>
      </main>
    );
  if (!account)
    return (
      <main className="grid min-h-screen bg-canvas px-5 py-12 text-ink lg:place-items-center">
        <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface shadow-xl lg:grid-cols-2">
          <aside className="relative overflow-hidden bg-slate-950 p-8 text-white sm:p-12">
            <span className="mb-16 inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-white dark:text-slate-950">
                {product.title.charAt(0)}
              </span>
              {product.title}
            </span>
            <p className="mb-4 text-xs font-semibold tracking-[.18em] text-indigo-200 uppercase">
              {product.eyebrow}
            </p>
            <h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">
              {product.tagline}
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
              {product.description}
            </p>
            <div className="mt-14 flex items-center gap-3 border-t border-white/15 pt-6 text-xs text-slate-300">
              <ShieldCheck className="text-emerald-300" size={20} />
              Your records stay with your account.
            </div>
          </aside>
          <section className="p-8 sm:p-12">
            <LockKeyhole className="mb-8 text-primary" size={28} />
            <h2 className="text-2xl font-semibold tracking-tight">
              {register ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {register
                ? "A private space for your work. No payment card required."
                : localCredentials
                  ? "Your local test account is ready to use."
                  : "Sign in to continue where you left off."}
            </p>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-danger/10 p-3 text-sm text-danger"
              >
                {error}
              </p>
            )}
            <form
              key={register ? "register" : "login"}
              onSubmit={submit}
              onInvalid={(event) => {
                event.preventDefault();
                const element = event.target;
                if (element instanceof HTMLInputElement)
                  setError(element.validationMessage);
              }}
              className="mt-7 grid gap-5"
            >
              {register && (
                <label className="grid gap-2 text-sm font-medium">
                  Your name
                  <Input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label className="grid gap-2 text-sm font-medium">
                Email address
                <Input
                  name="email"
                  defaultValue={register ? "" : (localCredentials?.email ?? "")}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={120}
                />
              </label>
              <div className="grid gap-2 text-sm font-medium">
                <label htmlFor="account-password">Password</label>
                <Input
                  id="account-password"
                  defaultValue={
                    register ? "" : (localCredentials?.password ?? "")
                  }
                  aria-describedby={register ? "password-guidance" : undefined}
                  name="password"
                  type="password"
                  minLength={register ? 12 : undefined}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  required
                />
                {register && (
                  <small
                    id="password-guidance"
                    className="font-normal text-muted"
                  >
                    At least 12 characters. Avoid common passwords and personal
                    details.
                  </small>
                )}
              </div>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create workspace"
                    : "Sign in"}
                <ArrowRight size={16} />
              </Button>
            </form>
            <p className="mt-7 text-sm text-muted">
              {register ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                disabled={busy}
                className="font-semibold text-primary hover:underline"
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Sign in" : "Create an account"}
              </button>
            </p>
            {error && (
              <button
                type="button"
                className="mt-4 text-sm font-semibold text-primary"
                onClick={() => void load()}
              >
                Reconnect
              </button>
            )}
          </section>
        </div>
      </main>
    );
  return (
    <>
      <div className="platform-session sticky top-0 z-40 flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2 text-xs text-muted sm:px-7">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-success" />
          <strong className="font-semibold text-ink">{account.name}</strong> ·
          Account workspace
        </span>
        <span className="flex items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setSettings(true)}
            className="hover:text-primary"
          >
            Account
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
                epoch.current++;
                setAccount(null);
                setRecords([]);
                setError("");
              } catch (error) {
                setError(message(error));
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1 hover:text-danger"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </span>
      </div>
      {error && (
        <div
          role="alert"
          className="border-b border-danger/25 bg-danger/10 px-5 py-3 text-sm text-danger"
        >
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            className="ml-2 underline"
            onClick={() => void load()}
          >
            Reload workspace
          </button>
        </div>
      )}
      <div key={account.id + ":" + loadId}>
        {children({
          account,
          records,
          revision,
          save,
          reload: () => void load(),
          busy,
        })}
      </div>
      <Modal
        busy={busy}
        open={settings}
        title="Your account"
        onClose={() => {
          setSettings(false);
          setNotice("");
        }}
      >
        <p className="text-sm text-muted">{account.email}</p>
        <form
          className="mt-5 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget,
              data = new FormData(form);
            setBusy(true);
            setNotice("");
            try {
              await request("auth/password", "POST", {
                password: data.get("password"),
                newPassword: data.get("newPassword"),
              });
              await restoreSession();
              form.reset();
              setNotice("Password changed.");
            } catch (error) {
              setNotice(message(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid gap-2 text-sm">
            Current password
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label className="grid gap-2 text-sm">
            New password
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Change password
          </Button>
        </form>
        {notice && (
          <p role="status" className="mt-4 text-sm text-muted">
            {notice}
          </p>
        )}
        <p className="mt-6 text-xs leading-6 text-muted">
          Keep account access details safe. Email recovery and social sign-in
          require a separately configured delivery/provider service and are not
          enabled in this local release.
        </p>
      </Modal>
    </>
  );
}
