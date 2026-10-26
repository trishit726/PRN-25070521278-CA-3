import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  NavLink,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AuthProvider, useAuth } from "./context/AuthContext";
import api from "./services/api";
import "./styles.css";

const paths = [
  ["Overview", "/", LayoutDashboard, ["admin", "technician", "student"]],
  ["Inventory", "/assets", Boxes, ["admin", "technician", "student"]],
  ["Laboratories", "/labs", Building2, ["admin", "technician"]],
  ["Maintenance", "/maintenance", Wrench, ["admin", "technician", "student"]],
  [
    "Reservations",
    "/reservations",
    CalendarDays,
    ["admin", "technician", "student"],
  ],
  ["Analytics", "/analytics", Activity, ["admin"]],
  ["Users", "/users", Users, ["admin"]],
];
function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="loader">Loading LabOps…</div>;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: loc.pathname + loc.search }}
      />
    );
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
function AuthPage({ register = false }) {
  const { login, register: signup } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (register) await signup(f);
      else await login(f);
      nav(loc.state?.from || "/");
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Unable to connect to LabOps API",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand">
          <span className="brand-icon">L</span>
          <b>LabOps</b>
        </div>
        <small>LABORATORY OPERATIONS PLATFORM</small>
        <h1>{register ? "Create your account" : "Welcome back"}</h1>
        <p>
          {register
            ? "Register as a student to request equipment."
            : "Sign in to continue to your workspace."}
        </p>
        {register && (
          <label>
            Full name
            <input name="name" required minLength="2" placeholder="Your name" />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            name="email"
            required
            placeholder="you@university.edu"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={register ? 8 : 1}
            placeholder={
              register ? "At least 8 characters" : "Enter your password"
            }
          />
        </label>
        {register && (
          <label>
            Department
            <input name="department" placeholder="e.g. Computer Science" />
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <button className="primary wide" disabled={busy}>
          {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
        <div className="auth-switch">
          {register ? "Already registered?" : "New to LabOps?"}{" "}
          <NavLink to={register ? "/login" : "/register"}>
            {register ? "Sign in" : "Create student account"}
          </NavLink>
        </div>
      </form>
    </main>
  );
}
function Shell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(0);
  return (
    <div className="app">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="brand">
          <span className="brand-icon">L</span>
          <b>LabOps</b>
          <button className="mobile-close" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="workspace">
          <span className="ws-icon">⌘</span>
          <span>
            <b>Science campus</b>
            <small>Operations workspace</small>
          </span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {paths
            .filter((p) => p[3].includes(user.role))
            .map(([name, path, Icon]) => (
              <NavLink
                end={path === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? "active" : "")}
                to={path}
                key={path}
              >
                <Icon size={18} />
                {name}
                {name === "Maintenance" && notice > 0 && <i>{notice}</i>}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/notifications">
            <Bell size={18} />
            Notifications
            <span className="unread-dot" />
          </NavLink>
          <div className="profile">
            <div className="avatar">
              {user.name
                ?.split(" ")
                .map((v) => v[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <span>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </span>
            <button title="Sign out" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="crumb">
            Workspace <span>/</span> <b>LabOps</b>
          </div>
          <div className="top-actions">
            <div className="search-global">
              <Search size={16} />
              <input
                placeholder="Search assets, labs…"
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (location.href = "/assets?search=" + e.currentTarget.value)
                }
              />
              <kbd>⌘ K</kbd>
            </div>
            <button
              className="icon-btn"
              title="Notifications"
              onClick={() => (location.href = "/notifications")}
            >
              <Bell size={18} />
            </button>
            <div className="top-avatar">{user.name?.[0]}</div>
          </div>
        </header>
        <div className="page-wrap">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/qr/:id" element={<QrAsset />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/labs" element={<Labs />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/notifications" element={<Notifications />} />
          </Routes>
        </div>
        <footer>
          LABOPS <span>•</span> Laboratory operations platform
        </footer>
      </div>
    </div>
  );
}
function useLoad(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((v) => v + 1);
  useEffect(() => {
    let alive = true;
    setError("");
    api
      .get(url)
      .then((r) => {
        if (alive) setData(r.data.data);
      })
      .catch((e) => {
        if (alive)
          setError(
            e.response?.data?.error?.message ||
              "Unable to load data. Check the API and database connection.",
          );
      });
    return () => {
      alive = false;
    };
  }, [url, reload]);
  return { data, error, refresh };
}
function PageHead({ eyebrow, title, description, action }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function ErrorState({ error }) {
  return error ? (
    <div className="error-state">
      <ShieldCheck size={20} />
      <div>
        <b>Couldn’t load this view</b>
        <p>{error}</p>
      </div>
    </div>
  ) : null;
}
function Metric({ label, value, detail, icon: Icon, tone = "violet" }) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <strong>{value ?? "—"}</strong>
        <small>{detail}</small>
      </div>
      <div className={`metric-icon ${tone}`}>
        <Icon size={19} />
      </div>
    </div>
  );
}
function Dashboard() {
  const { user } = useAuth();
  const admin = user.role === "admin";
  const { data, error } = useLoad(
    admin
      ? "/analytics/overview"
      : user.role === "technician"
        ? "/assets"
        : "/reservations",
  );
  const a = admin ? data : {};
  const [chart, setChart] = useState(null);
  useEffect(() => {
    if (admin)
      api
        .get("/analytics/assets")
        .then((r) => setChart(r.data.data))
        .catch(() => {});
  }, [admin]);
  const { data: assets } = useLoad("/assets?limit=6");
  const { data: maintenance } = useLoad("/maintenance");
  const title = user.role === "admin" ? "Good morning" : `Welcome back`;
  return (
    <>
      <PageHead
        eyebrow="MONDAY, OCTOBER 26, 2026"
        title={`${title}, ${user.name.split(" ")[0]}`}
        description="Here’s what’s happening across your laboratory operations today."
        action={
          <button
            className="secondary"
            onClick={() =>
              (location.href =
                user.role === "student" ? "/reservations" : "/assets")
            }
          >
            <Plus size={16} />{" "}
            {user.role === "student" ? "Request equipment" : "Add equipment"}
          </button>
        }
      />
      <ErrorState error={error} />
      <section className="metrics">
        {admin ? (
          <>
            <Metric
              label="Total equipment"
              value={a.totalAssets}
              detail="Across all laboratories"
              icon={Boxes}
            />
            <Metric
              label="Available assets"
              value={a.availableAssets}
              detail="Ready for use"
              icon={Check}
              tone="green"
            />
            <Metric
              label="Under maintenance"
              value={a.maintenanceAssets}
              detail="Requires attention"
              icon={Wrench}
              tone="amber"
            />
            <Metric
              label="Pending reservations"
              value={a.pendingReservations}
              detail={`${a.totalLaboratories ?? "—"} laboratories`}
              icon={CalendarDays}
              tone="blue"
            />
          </>
        ) : (
          <>
            <Metric
              label={
                user.role === "technician"
                  ? "Assigned equipment"
                  : "My reservations"
              }
              value={Array.isArray(data) ? data.length : "—"}
              detail={
                user.role === "technician"
                  ? "In your laboratories"
                  : "Your booking history"
              }
              icon={user.role === "technician" ? Boxes : CalendarDays}
            />
            <Metric
              label="Open maintenance"
              value={
                maintenance?.filter(
                  (m) => !["resolved", "rejected"].includes(m.status),
                ).length ?? "—"
              }
              detail="Requests needing attention"
              icon={Wrench}
              tone="amber"
            />
            <Metric
              label="Available assets"
              value={
                assets?.filter((x) => x.status === "available").length ?? "—"
              }
              detail="In the current view"
              icon={Check}
              tone="green"
            />
            <Metric
              label="Your role"
              value={user.role}
              detail={user.department || "Science campus"}
              icon={ShieldCheck}
              tone="blue"
            />
          </>
        )}
      </section>
      {admin && (
        <section className="chart-grid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Asset distribution</h2>
                <p>Equipment by laboratory</p>
              </div>
              <button className="select-pill">
                This year <ChevronDown size={14} />
              </button>
            </div>
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={chart?.byLab || []}>
                  <CartesianGrid vertical={false} stroke="#263248" />
                  <XAxis
                    dataKey="name"
                    stroke="#8491a7"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#8491a7" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#10182a",
                      border: "1px solid #263248",
                      borderRadius: 10,
                    }}
                  />
                  <Bar dataKey="count" fill="#716cf7" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Equipment condition</h2>
                <p>Current condition breakdown</p>
              </div>
              <button className="dots">•••</button>
            </div>
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chart?.byCondition || []}
                      dataKey="count"
                      nameKey="_id"
                      innerRadius={61}
                      outerRadius={83}
                      paddingAngle={4}
                    >
                      {(chart?.byCondition || []).map((_, i) => (
                        <Cell
                          key={i}
                          fill={["#10b981", "#f59e0b", "#ef4444"][i % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="legend">
                {(chart?.byCondition || []).map((c, i) => (
                  <span key={c._id}>
                    <i
                      style={{
                        background: ["#10b981", "#f59e0b", "#ef4444"][i % 3],
                      }}
                    />
                    {c._id}
                    <b>{c.count}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>
              {admin ? "Recently added equipment" : "Equipment inventory"}
            </h2>
            <p>Quick access to your laboratory assets</p>
          </div>
          <NavLink className="text-link" to="/assets">
            View all <span>→</span>
          </NavLink>
        </div>
        <AssetTable items={assets || []} />
      </section>
      <section className="panel table-panel activity-panel">
        <div className="panel-head">
          <div>
            <h2>Maintenance queue</h2>
            <p>Latest service requests</p>
          </div>
          <NavLink className="text-link" to="/maintenance">
            Open queue →
          </NavLink>
        </div>
        <div className="activity-list">
          {(maintenance || []).slice(0, 4).map((m) => (
            <div className="activity-row" key={m._id}>
              <div className="activity-icon">
                <Wrench size={16} />
              </div>
              <div>
                <b>{m.title}</b>
                <small>
                  {m.assetId?.name || "Equipment"} ·{" "}
                  {new Date(m.createdAt).toLocaleDateString()}
                </small>
              </div>
              <Badge value={m.status} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function Badge({ value }) {
  const v = String(value || "unknown").replaceAll("_", " ");
  return <span className={`badge ${v.replaceAll(" ", "-")}`}>{v}</span>;
}
function AssetTable({ items = [] }) {
  const { user } = useAuth();
  const canManage = ["admin", "technician"].includes(user.role);
  const canRetire = user.role === "admin";
  async function edit(e, a) {
    e.stopPropagation();
    const name = window.prompt("Equipment name", a.name);
    if (!name?.trim() || name.trim() === a.name) return;
    try {
      await api.patch(`/assets/${a._id}`, { name: name.trim() });
      location.reload();
    } catch (error) {
      window.alert(
        error.response?.data?.error?.message || "Could not update equipment",
      );
    }
  }
  async function retire(e, a) {
    e.stopPropagation();
    if (
      !window.confirm(
        `Retire ${a.name}? It will remain in the inventory history.`,
      )
    )
      return;
    try {
      await api.delete(`/assets/${a._id}`);
      location.reload();
    } catch (error) {
      window.alert(
        error.response?.data?.error?.message || "Could not retire equipment",
      );
    }
  }
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>EQUIPMENT</th>
            <th>ASSET CODE</th>
            <th>LABORATORY</th>
            <th>CONDITION</th>
            <th>STATUS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr
              key={a._id}
              onClick={() => (location.href = `/assets/${a._id}`)}
            >
              <td>
                <div className="asset-name">
                  <span className="asset-glyph">
                    <Boxes size={17} />
                  </span>
                  <span>
                    <b>{a.name}</b>
                    <small>{a.category}</small>
                  </span>
                </div>
              </td>
              <td className="code">{a.assetCode}</td>
              <td>{a.laboratoryId?.name || "—"}</td>
              <td>
                <Badge value={a.condition} />
              </td>
              <td>
                <Badge value={a.status} />
              </td>
              <td>
                {canManage && (
                  <div className="inline-actions">
                    <button className="quiet-btn" onClick={(e) => edit(e, a)}>
                      Edit
                    </button>
                    {canRetire && a.status !== "retired" && (
                      <button
                        className="quiet-btn red-text"
                        onClick={(e) => retire(e, a)}
                      >
                        Retire
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className="empty">
          No equipment found. Add assets after connecting your database.
        </div>
      )}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Assets() {
  const { user } = useAuth();
  const [search, setSearch] = useState(
    new URLSearchParams(location.search).get("search") || "",
  );
  const [status, setStatus] = useState("");
  const endpoint =
    "/assets?" +
    new URLSearchParams({ search, status, limit: "100" }).toString();
  const { data, error, refresh } = useLoad(endpoint);
  const [modal, setModal] = useState(false);
  const [msg, setMsg] = useState("");
  async function create(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api.post("/assets", form);
      setModal(false);
      refresh();
      setMsg("Equipment added successfully");
    } catch (err) {
      setMsg(err.response?.data?.error?.message || "Could not save equipment");
    }
  }
  const { data: labs } = useLoad("/labs");
  return (
    <>
      <PageHead
        eyebrow="INVENTORY"
        title="Equipment inventory"
        description="Track, search, and manage equipment across your laboratories."
        action={
          ["admin", "technician"].includes(user.role) && (
            <button className="primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Add equipment
            </button>
          )
        }
      />
      <ErrorState error={error} />
      {msg && (
        <div className="toast" onClick={() => setMsg("")}>
          {msg} <X size={14} />
        </div>
      )}
      <div className="filter-row">
        <div className="filter-search">
          <Search size={16} />
          <input
            value={search}
            placeholder="Search equipment or serial number"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="under_maintenance">Under maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <section className="panel table-panel">
        <AssetTable items={Array.isArray(data) ? data : []} />
      </section>
      {modal && (
        <Modal title="Add equipment" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={create}>
            <label>
              Equipment name
              <input name="name" required />
            </label>
            <label>
              Asset code
              <input name="assetCode" required />
            </label>
            <label>
              Serial number
              <input name="serialNumber" required />
            </label>
            <label>
              Category
              <input name="category" required />
            </label>
            <label>
              Laboratory
              <select name="laboratoryId" required>
                <option value="">Select laboratory</option>
                {(labs || []).map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Manufacturer
              <input name="manufacturer" />
            </label>
            <label>
              Purchase date
              <input type="date" name="purchaseDate" />
            </label>
            <label>
              Condition
              <select name="condition">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="damaged">Damaged</option>
              </select>
            </label>
            <label className="span2">
              Description
              <textarea name="description" rows="3" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary">Save equipment</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function AssetDetail() {
  const { id } = useParams();
  const { data: a, error } = useLoad(`/assets/${id}`);
  const [qr, setQr] = useState("");
  useEffect(() => {
    api
      .get(`/assets/${id}/qr`)
      .then((r) => setQr(r.data.data.dataUrl))
      .catch(() => {});
  }, [id]);
  if (error) return <ErrorState error={error} />;
  if (!a) return <div className="loader">Loading asset…</div>;
  return (
    <>
      <PageHead
        eyebrow="ASSET DETAILS"
        title={a.name}
        description={`${a.assetCode} · ${a.serialNumber}`}
        action={<Badge value={a.status} />}
      />
      <div className="detail-grid">
        <section className="panel detail-card">
          <h2>Equipment information</h2>
          <div className="info-grid">
            {[
              ["Category", a.category],
              ["Manufacturer", a.manufacturer || "—"],
              ["Laboratory", a.laboratoryId?.name],
              ["Condition", a.condition],
              [
                "Purchase date",
                a.purchaseDate
                  ? new Date(a.purchaseDate).toLocaleDateString()
                  : "—",
              ],
              ["Serial number", a.serialNumber],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p>{a.description}</p>
        </section>
        <section className="panel qr-card">
          <h2>Asset QR code</h2>
          {qr ? (
            <img src={qr} alt="Asset QR code" />
          ) : (
            <div className="qr-placeholder">QR code unavailable</div>
          )}
          <small>Scan to open authenticated asset details</small>
        </section>
      </div>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Maintenance history</h2>
            <p>Reported service and repairs</p>
          </div>
        </div>
        <div className="activity-list">
          {(a.maintenance || []).map((m) => (
            <div className="activity-row" key={m._id}>
              <div className="activity-icon">
                <Wrench size={16} />
              </div>
              <div>
                <b>{m.title}</b>
                <small>{m.description}</small>
              </div>
              <Badge value={m.status} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function QrAsset() {
  const { id } = useParams();
  const { data, error } = useLoad(`/assets/qr/${id}`);
  if (error) return <ErrorState error={error} />;
  return (
    <div className="panel detail-card">
      <h2>Scanned equipment</h2>
      {data ? (
        <>
          <h1>{data.name}</h1>
          <p>
            {data.assetCode} · {data.laboratoryId?.name}
          </p>
          <Badge value={data.status} />
        </>
      ) : (
        <div className="loader">Loading asset…</div>
      )}
    </div>
  );
}
function Labs() {
  const { user } = useAuth();
  const { data, error, refresh } = useLoad("/labs");
  const [modal, setModal] = useState(false);
  async function create(e) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    await api.post("/labs", form);
    setModal(false);
    refresh();
  }
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE"
        title="Laboratories"
        description="Manage science spaces, assigned technicians, and location details."
        action={
          user.role === "admin" && (
            <button className="primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Add laboratory
            </button>
          )
        }
      />
      <ErrorState error={error} />
      <div className="lab-grid">
        {(data || []).map((l) => (
          <div className="panel lab-card" key={l._id}>
            <div className="lab-icon">
              <Building2 size={20} />
            </div>
            <Badge value={l.isActive ? "active" : "inactive"} />
            <h2>{l.name}</h2>
            <p>
              {l.code} · {l.department}
            </p>
            <div className="lab-location">
              {l.location || "Location not set"}
            </div>
            <div className="lab-foot">
              <span>{l.technicianIds?.length || 0} technicians</span>
              <span>{l.equipmentCount || "—"} assets</span>
            </div>
          </div>
        ))}
      </div>
      {!data?.length && !error && (
        <div className="empty panel">No laboratories have been created.</div>
      )}
      {modal && (
        <Modal title="Add laboratory" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={create}>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Code
              <input name="code" required />
            </label>
            <label>
              Department
              <input name="department" />
            </label>
            <label>
              Location
              <input name="location" />
            </label>
            <label className="span2">
              Description
              <textarea name="description" rows="3" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary">Create laboratory</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function MaintenancePage() {
  const { user } = useAuth();
  const { data, error, refresh } = useLoad("/maintenance");
  const { data: assets } = useLoad("/assets?limit=100");
  const [modal, setModal] = useState(false);
  async function create(e) {
    e.preventDefault();
    try {
      await api.post(
        "/maintenance",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setModal(false);
      refresh();
    } catch (err) {
      alert(err.response?.data?.error?.message || "Unable to submit report");
    }
  }
  async function update(id, status) {
    await api.patch(`/maintenance/${id}`, { status });
    refresh();
  }
  return (
    <>
      <PageHead
        eyebrow="SERVICE DESK"
        title="Maintenance requests"
        description="Report faults, assign technicians, and follow repairs through resolution."
        action={
          user.role === "student" && (
            <button className="primary" onClick={() => setModal(true)}>
              <Plus size={16} /> Report a fault
            </button>
          )
        }
      />
      <ErrorState error={error} />
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REQUEST</th>
                <th>EQUIPMENT</th>
                <th>PRIORITY</th>
                <th>REPORTED BY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((m) => (
                <tr key={m._id}>
                  <td>
                    <div className="asset-name">
                      <span className="asset-glyph warn">
                        <Wrench size={16} />
                      </span>
                      <span>
                        <b>{m.title}</b>
                        <small>
                          {new Date(m.createdAt).toLocaleDateString()}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>{m.assetId?.name}</td>
                  <td>
                    <Badge value={m.priority} />
                  </td>
                  <td>{m.reportedBy?.name}</td>
                  <td>
                    <Badge value={m.status} />
                  </td>
                  <td>
                    {["admin", "technician"].includes(user.role) &&
                      m.status !== "resolved" && (
                        <select
                          className="tiny-select"
                          value={m.status}
                          onChange={(e) => update(m._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length && (
            <div className="empty">No maintenance requests found.</div>
          )}
        </div>
      </section>
      {modal && (
        <Modal title="Report equipment fault" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={create}>
            <label className="span2">
              Equipment
              <select name="assetId" required>
                <option value="">Select equipment</option>
                {(assets || []).map((a) => (
                  <option value={a._id} key={a._id}>
                    {a.name} · {a.assetCode}
                  </option>
                ))}
              </select>
            </label>
            <label className="span2">
              Issue title
              <input
                name="title"
                required
                minLength="3"
                placeholder="e.g. Centrifuge makes unusual noise"
              />
            </label>
            <label>
              Priority
              <select name="priority">
                <option>low</option>
                <option>medium</option>
                <option>high</option>
                <option>critical</option>
              </select>
            </label>
            <label className="span2">
              Description
              <textarea name="description" required minLength="5" rows="4" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary">Submit report</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Reservations() {
  const { user } = useAuth();
  const { data, error, refresh } = useLoad("/reservations");
  const { data: assets } = useLoad("/assets?status=available&limit=100");
  const [modal, setModal] = useState(false);
  async function create(e) {
    e.preventDefault();
    try {
      await api.post(
        "/reservations",
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      setModal(false);
      refresh();
    } catch (err) {
      alert(
        err.response?.data?.error?.message || "Unable to request reservation",
      );
    }
  }
  async function change(id, status) {
    try {
      await api.patch(`/reservations/${id}/status`, { status });
      refresh();
    } catch (err) {
      alert(
        err.response?.data?.error?.message || "Could not update reservation",
      );
    }
  }
  async function cancel(id) {
    await api.patch(`/reservations/${id}/cancel`);
    refresh();
  }
  return (
    <>
      <PageHead
        eyebrow="BOOKING DESK"
        title="Reservations"
        description="Request equipment time and manage approvals for upcoming lab work."
        action={
          user.role === "student" && (
            <button className="primary" onClick={() => setModal(true)}>
              <Plus size={16} /> New reservation
            </button>
          )
        }
      />
      <ErrorState error={error} />
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EQUIPMENT</th>
                <th>REQUESTER</th>
                <th>TIME WINDOW</th>
                <th>PURPOSE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((r) => (
                <tr key={r._id}>
                  <td>
                    <b>{r.assetId?.name}</b>
                  </td>
                  <td>{r.userId?.name}</td>
                  <td>
                    {new Date(r.startTime).toLocaleString()}
                    <small className="block">
                      to {new Date(r.endTime).toLocaleString()}
                    </small>
                  </td>
                  <td>{r.purpose}</td>
                  <td>
                    <Badge value={r.status} />
                  </td>
                  <td>
                    {user.role === "admin" && r.status === "pending" ? (
                      <div className="inline-actions">
                        <button
                          className="icon-btn green-text"
                          title="Approve"
                          onClick={() => change(r._id, "approved")}
                        >
                          <Check size={17} />
                        </button>
                        <button
                          className="icon-btn red-text"
                          title="Reject"
                          onClick={() => change(r._id, "rejected")}
                        >
                          <X size={17} />
                        </button>
                      </div>
                    ) : (
                      user.role === "student" &&
                      ["pending", "approved"].includes(r.status) && (
                        <button
                          className="quiet-btn"
                          onClick={() => cancel(r._id)}
                        >
                          Cancel
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length && (
            <div className="empty">No reservation requests found.</div>
          )}
        </div>
      </section>
      {modal && (
        <Modal title="Request equipment" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={create}>
            <label className="span2">
              Equipment
              <select name="assetId" required>
                <option value="">Select available equipment</option>
                {(assets || []).map((a) => (
                  <option value={a._id} key={a._id}>
                    {a.name} · {a.assetCode}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start time
              <input
                type="datetime-local"
                name="startTime"
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </label>
            <label>
              End time
              <input type="datetime-local" name="endTime" required />
            </label>
            <label className="span2">
              Purpose
              <textarea name="purpose" rows="3" required minLength="5" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary">Submit request</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Analytics() {
  const { data: overview, error } = useLoad("/analytics/overview");
  const { data: assetData } = useLoad("/analytics/assets");
  const { data: maint } = useLoad("/analytics/maintenance");
  const { data: res } = useLoad("/analytics/reservations");
  return (
    <>
      <PageHead
        eyebrow="INSIGHTS"
        title="Reports & analytics"
        description="Operational trends and inventory health, aggregated from your database."
      />
      <ErrorState error={error} />
      <section className="metrics">
        <Metric
          label="Total equipment"
          value={overview?.totalAssets}
          detail="In all laboratories"
          icon={Boxes}
        />
        <Metric
          label="Active users"
          value={overview?.totalUsers}
          detail="Across roles"
          icon={Users}
          tone="green"
        />
        <Metric
          label="Maintenance reports"
          value={maint?.reduce((n, x) => n + x.count, 0)}
          detail="All time by month"
          icon={Wrench}
          tone="amber"
        />
        <Metric
          label="Reservations"
          value={res?.stats?.reduce((n, x) => n + x.count, 0)}
          detail="All statuses"
          icon={CalendarDays}
          tone="blue"
        />
      </section>
      <section className="chart-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Maintenance trend</h2>
              <p>Monthly requests by status</p>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart
                data={(maint || []).map((x) => ({
                  month: x._id.month,
                  status: x._id.status,
                  count: x.count,
                }))}
              >
                <CartesianGrid vertical={false} stroke="#263248" />
                <XAxis dataKey="month" stroke="#8491a7" />
                <YAxis stroke="#8491a7" />
                <Tooltip
                  contentStyle={{
                    background: "#10182a",
                    border: "1px solid #263248",
                  }}
                />
                <Area dataKey="count" stroke="#6366f1" fill="#6366f133" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Most reserved equipment</h2>
              <p>By request count</p>
            </div>
          </div>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={res?.top || []} layout="vertical">
                <CartesianGrid horizontal={false} stroke="#263248" />
                <XAxis type="number" stroke="#8491a7" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke="#8491a7"
                />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <section className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Asset distribution by laboratory</h2>
            <p>Inventory coverage</p>
          </div>
        </div>
        <div className="activity-list">
          {(assetData?.byLab || []).map((l) => (
            <div className="activity-row" key={l._id}>
              <div className="activity-icon">
                <Building2 size={16} />
              </div>
              <div>
                <b>{l.name}</b>
                <small>Registered equipment</small>
              </div>
              <strong>{l.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function UsersPage() {
  const { data, error, refresh } = useLoad("/users");
  const [modal, setModal] = useState(false);
  async function create(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await api.post("/users", f);
    setModal(false);
    refresh();
  }
  async function toggle(u) {
    await api.patch(`/users/${u._id}`, { isActive: !u.isActive });
    refresh();
  }
  return (
    <>
      <PageHead
        eyebrow="ADMINISTRATION"
        title="User management"
        description="Manage account access, roles, and laboratory personnel."
        action={
          <button className="primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Create staff account
          </button>
        }
      />
      <ErrorState error={error} />
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>USER</th>
                <th>EMAIL</th>
                <th>DEPARTMENT</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data || []).map((u) => (
                <tr key={u._id}>
                  <td>
                    <b>{u.name}</b>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.department || "—"}</td>
                  <td>
                    <Badge value={u.role} />
                  </td>
                  <td>
                    <Badge value={u.isActive ? "active" : "inactive"} />
                  </td>
                  <td>
                    <button className="quiet-btn" onClick={() => toggle(u)}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {modal && (
        <Modal title="Create staff account" onClose={() => setModal(false)}>
          <form className="form-grid" onSubmit={create}>
            <label className="span2">
              Full name
              <input name="name" required />
            </label>
            <label className="span2">
              Email
              <input type="email" name="email" required />
            </label>
            <label>
              Temporary password
              <input type="password" minLength="8" name="password" required />
            </label>
            <label>
              Role
              <select name="role">
                <option value="technician">Technician</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
            <label className="span2">
              Department
              <input name="department" />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button className="primary">Create account</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Notifications() {
  const { data, error, refresh } = useLoad("/notifications");
  async function read(n) {
    await api.patch(`/notifications/${n._id}/read`);
    refresh();
  }
  return (
    <>
      <PageHead
        eyebrow="INBOX"
        title="Notifications"
        description="Updates about reservations, maintenance, and your laboratory workspace."
      />
      <ErrorState error={error} />
      <section className="panel activity-list notifications">
        {(data || []).map((n) => (
          <div
            className={`activity-row ${n.isRead ? "read" : ""}`}
            key={n._id}
            onClick={() => read(n)}
          >
            <div className="activity-icon">
              <Bell size={16} />
            </div>
            <div>
              <b>{n.title}</b>
              <small>
                {n.message} · {new Date(n.createdAt).toLocaleString()}
              </small>
            </div>
            {!n.isRead && <span className="unread-dot" />}
          </div>
        ))}
        {!data?.length && <div className="empty">You’re all caught up.</div>}
      </section>
    </>
  );
}
function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <AuthPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" /> : <AuthPage register />}
      />
      <Route
        path="/*"
        element={
          <Guard>
            <Shell />
          </Guard>
        }
      />
    </Routes>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
