 "use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./appointment.module.css";

type AppointmentStatus = "terkonfirmasi" | "menunggu" | "selesai" | "dibatalkan";

type Appointment = {
  id: string | number;
  nama: string;
  company: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  typeLabel: string;
  sales?: string;
  location?: string;
  notes?: string;
  status: AppointmentStatus;
  createdBy: "ai" | "manual";
  aiNote?: string;
};

const meetingTypes = [
  { value: "demo", label: "Demo Produk" },
  { value: "konsultasi", label: "Konsultasi" },
  { value: "negosiasi", label: "Negosiasi" },
  { value: "onboarding", label: "Onboarding" },
  { value: "lainnya", label: "Lainnya" },
];

const staffList = ["Rina Kartika", "Dimas Pratama", "Siti Rahayu", "Arif Budiman"];

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toAppointment(raw: Record<string, unknown>, index: number): Appointment {
  const dateTime = String(raw.dateTime ?? raw.datetime ?? raw.startTime ?? "");
  const date = String(raw.date ?? (dateTime ? dateTime.slice(0, 10) : todayString()));
  const time = String(raw.time ?? (dateTime.length >= 16 ? dateTime.slice(11, 16).replace(":", ".") : "09.00"));
  const rawStatus = String(raw.status ?? "menunggu").toLowerCase();
  const statusMap: Record<string, AppointmentStatus> = {
    confirmed: "terkonfirmasi", terkonfirmasi: "terkonfirmasi", pending: "menunggu", menunggu: "menunggu",
    completed: "selesai", selesai: "selesai", cancelled: "dibatalkan", canceled: "dibatalkan", dibatalkan: "dibatalkan",
  };
  const type = String(raw.type ?? "lainnya");
  return {
    id: (raw.id as string | number | undefined) ?? index + 1,
    nama: String(raw.nama ?? raw.name ?? raw.contactName ?? raw.customerName ?? "Kontak tanpa nama"),
    company: String(raw.company ?? raw.perusahaan ?? raw.organization ?? "—"),
    phone: String(raw.phone ?? raw.telepon ?? raw.phoneNumber ?? ""),
    email: String(raw.email ?? ""),
    date,
    time: time.replace(":", "."),
    duration: Number(raw.duration ?? 60),
    type,
    typeLabel: String(raw.typeLabel ?? meetingTypes.find((item) => item.value === type)?.label ?? type),
    sales: String(raw.sales ?? raw.assignee ?? raw.owner ?? ""),
    location: String(raw.location ?? raw.meetingLink ?? ""),
    notes: String(raw.notes ?? raw.catatan ?? ""),
    status: statusMap[rawStatus] ?? "menunggu",
    createdBy: String(raw.createdBy ?? raw.source ?? "").toLowerCase().includes("ai") ? "ai" : "manual",
    aiNote: String(raw.aiNote ?? ""),
  };
}

function formatDate(value: string) {
  if (!value) return "Tanggal belum ditentukan";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "—";
}

const statusLabel: Record<AppointmentStatus, string> = {
  terkonfirmasi: "Terkonfirmasi",
  menunggu: "Menunggu",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export default function AppointmentPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("today");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    nama: "", company: "", phone: "", email: "", datetime: `${todayString()}T09:00`,
    duration: "60", type: "demo", sales: "", location: "", notes: "",
  });

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      if (!response.ok) throw new Error(`API mengembalikan status ${response.status}`);
      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : payload.appointments ?? payload.data ?? payload.items ?? [];
      if (!Array.isArray(list)) throw new Error("Format data appointment dari API tidak dikenali.");
      const parsed = list.map((item: Record<string, unknown>, index: number) => toAppointment(item, index));
      setAppointments(parsed);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Gagal memuat appointment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAppointments(); }, [loadAppointments]);

  const counts = useMemo(() => ({
    confirmed: appointments.filter((item) => item.status === "terkonfirmasi").length,
    pending: appointments.filter((item) => item.status === "menunggu").length,
    completed: appointments.filter((item) => item.status === "selesai" && item.date === todayString()).length,
    cancelled: appointments.filter((item) => item.status === "dibatalkan").length,
    aiToday: appointments.filter((item) => item.createdBy === "ai" && item.date === todayString()).length,
  }), [appointments]);

  const filtered = useMemo(() => {
    const today = todayString();
    const tomorrowDate = new Date(`${today}T00:00:00`);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;
    return appointments.filter((item) => {
      if (rangeFilter === "today" && item.date !== today) return false;
      if (rangeFilter === "tomorrow" && item.date !== tomorrow) return false;
      if (rangeFilter === "week") {
        const current = new Date(`${item.date}T00:00:00`).getTime();
        const start = new Date(`${today}T00:00:00`).getTime();
        if (current < start || current > start + 6 * 86400000) return false;
      }
      if (rangeFilter === "month" && !item.date.startsWith(today.slice(0, 7))) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      const needle = query.trim().toLowerCase();
      if (needle && !`${item.nama} ${item.company} ${item.phone} ${item.typeLabel}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [appointments, rangeFilter, statusFilter, query]);

  const selected = appointments.find((item) => String(item.id) === String(selectedId)) ?? null;

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const [date, time] = form.datetime.split("T");
    const typeLabel = meetingTypes.find((item) => item.value === form.type)?.label ?? form.type;
    const body = {
      nama: form.nama.trim(), company: form.company.trim(), phone: form.phone.trim(), email: form.email.trim(),
      date, time: time.replace(":", "."), duration: Number(form.duration), type: form.type, typeLabel,
      sales: form.sales, location: form.location.trim(), notes: form.notes.trim(), status: "menunggu", createdBy: "manual",
    };
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error ?? `Gagal menyimpan appointment (HTTP ${response.status}).`);
      }
      setShowForm(false);
      setNotice("Appointment berhasil dibuat.");
      setForm({ nama: "", company: "", phone: "", email: "", datetime: `${todayString()}T09:00`, duration: "60", type: "demo", sales: "", location: "", notes: "" });
      await loadAppointments();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gagal menyimpan appointment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>OPERASIONAL / JADWAL</div>
          <h1>Appointment <span className={styles.aiTag}>✦ AI Booking</span></h1>
          <p className={styles.subtitle}>Kelola jadwal meeting, konfirmasi pelanggan, dan appointment yang dibuat AI Agent.</p>
          <div className={styles.stats}>
            <span><i className={`${styles.dot} ${styles.green}`} />Terkonfirmasi <b>{counts.confirmed}</b></span>
            <span><i className={`${styles.dot} ${styles.amber}`} />Menunggu <b>{counts.pending}</b></span>
            <span><i className={`${styles.dot} ${styles.blue}`} />Selesai hari ini <b>{counts.completed}</b></span>
            <span><i className={`${styles.dot} ${styles.gray}`} />Dibatalkan <b>{counts.cancelled}</b></span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.live}><i /> AI Agent Booking</span>
          <button className={styles.secondaryButton} onClick={() => void loadAppointments()} type="button">↻ Refresh</button>
          <button className={styles.primaryButton} onClick={() => { setNotice(""); setShowForm(true); }} type="button">＋ Buat Appointment</button>
        </div>
      </header>

      <section className={styles.aiBanner}>
        <div className={styles.bannerIcon}>✦</div>
        <div className={styles.bannerCopy}>
          <strong>AI Agent Booking aktif — <span>{counts.aiToday} appointment</span> dibuat otomatis hari ini</strong>
          <p>Appointment dari AI, Calendly, dan input manual dikelola dalam satu daftar.</p>
        </div>
        <span className={styles.bannerPill}>● Sinkronisasi API</span>
      </section>

      {notice && <div className={styles.notice} role="status">{notice}</div>}
      {loadError && <div className={styles.error}><strong>Data belum dapat dimuat.</strong> {loadError}<button type="button" onClick={() => void loadAppointments()}>Coba lagi</button></div>}

      <section className={styles.workspace}>
        <div className={styles.listPanel}>
          <div className={styles.toolbar}>
            <div className={styles.dateTabs} aria-label="Filter tanggal">
              {([{ value: "today", label: "Hari Ini" }, { value: "tomorrow", label: "Besok" }, { value: "week", label: "7 Hari" }, { value: "month", label: "Bulan Ini" }, { value: "all", label: "Semua" }]).map((tab) => (
                <button type="button" key={tab.value} className={rangeFilter === tab.value ? styles.activeTab : ""} onClick={() => setRangeFilter(tab.value)}>{tab.label}</button>
              ))}
            </div>
            <div className={styles.filters}>
              <label className={styles.search}>⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama / perusahaan..." /></label>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status">
                <option value="all">Semua Status</option>
                <option value="terkonfirmasi">Terkonfirmasi</option>
                <option value="menunggu">Menunggu</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>Kontak / Perusahaan</th><th>Jadwal</th><th>Jenis</th><th>Penanggung Jawab</th><th>Status</th><th>Dibuat</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className={styles.stateCell}>Memuat appointment…</td></tr> :
                  filtered.length === 0 ? <tr><td colSpan={6} className={styles.stateCell}><span className={styles.emptyIcon}>▦</span><strong>Belum ada appointment</strong><small>Ubah filter tanggal atau buat appointment baru.</small></td></tr> :
                  filtered.map((item) => (
                    <tr key={item.id} onClick={() => setSelectedId(item.id)} className={String(selectedId) === String(item.id) ? styles.selectedRow : ""}>
                      <td><div className={styles.contact}><span className={styles.avatar}>{initials(item.nama)}</span><span className={styles.contactText}><strong>{item.nama}</strong><small>{item.company || item.phone || "—"}</small></span></div></td>
                      <td><strong className={styles.date}>{formatDate(item.date)}</strong><small className={styles.time}>{item.time.replace(".", ":")} WIB · {item.duration} menit</small></td>
                      <td><span className={`${styles.typeBadge} ${styles[`type_${item.type}` as keyof typeof styles] ?? styles.type_lainnya}`}>{item.typeLabel}</span></td>
                      <td><span className={styles.staff}>{item.sales || "—"}</span></td>
                      <td><span className={`${styles.status} ${styles[`status_${item.status}`]}`}>{statusLabel[item.status]}</span></td>
                      <td><span className={`${styles.creator} ${item.createdBy === "ai" ? styles.creatorAi : styles.creatorManual}`}>{item.createdBy === "ai" ? "✦ AI" : "● Manual"}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <footer className={styles.listFooter}><span>Menampilkan <b>{filtered.length}</b> dari {appointments.length} appointment</span><span>Data diperbarui dari API</span></footer>
        </div>

        <aside className={styles.detailPanel}>
          {selected ? <>
            <div className={styles.detailHeader}><div><span className={styles.detailEyebrow}>DETAIL APPOINTMENT</span><h2>Informasi Kontak</h2></div><button type="button" aria-label="Tutup detail" onClick={() => setSelectedId(null)}>×</button></div>
            <div className={styles.person}><span className={styles.personAvatar}>{initials(selected.nama)}</span><div><strong>{selected.nama}</strong><small>{selected.company || "Perusahaan belum diisi"}</small><small>{selected.phone || "Nomor telepon belum diisi"}</small></div></div>
            <span className={`${styles.status} ${styles[`status_${selected.status}`]}`}>{statusLabel[selected.status]}</span>
            <div className={styles.detailRows}>
              <div><small>Tanggal</small><strong>{formatDate(selected.date)}</strong></div>
              <div><small>Waktu</small><strong>{selected.time.replace(".", ":")} WIB ({selected.duration} menit)</strong></div>
              <div><small>Jenis pertemuan</small><strong>{selected.typeLabel}</strong></div>
              <div><small>Penanggung jawab</small><strong>{selected.sales || "Belum ditentukan"}</strong></div>
              <div><small>Dibuat melalui</small><strong>{selected.createdBy === "ai" ? "✦ AI Otomatis" : "Input Manual"}</strong></div>
              <div><small>Lokasi / Meeting link</small><strong className={styles.breakText}>{selected.location || "Belum ditentukan"}</strong></div>
              <div><small>Email</small><strong className={styles.breakText}>{selected.email || "—"}</strong></div>
              <div><small>Catatan</small><strong>{selected.notes || "—"}</strong></div>
            </div>
            {selected.aiNote && <div className={styles.aiNote}><strong>✦ Catatan AI</strong><p>{selected.aiNote}</p></div>}
            {selected.phone && <a className={styles.whatsapp} href={`https://wa.me/${selected.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">◉ Hubungi via WhatsApp</a>}
            <button className={styles.secondaryButtonFull} type="button" onClick={() => { setForm({ nama: selected.nama, company: selected.company, phone: selected.phone, email: selected.email ?? "", datetime: `${selected.date}T${selected.time.replace(".", ":")}`, duration: String(selected.duration), type: selected.type, sales: selected.sales ?? "", location: selected.location ?? "", notes: selected.notes ?? "" }); setNotice("Edit melalui form belum tersambung ke endpoint update; data tidak diubah."); }}>Salin data ke form</button>
          </> : <div className={styles.detailEmpty}><span>◷</span><strong>Pilih appointment</strong><p>Pilih baris pada tabel untuk melihat detail kontak, jadwal, dan informasi booking.</p><div className={styles.detailMiniStats}><div><b>{counts.confirmed}</b><small>Terkonfirmasi</small></div><div><b>{counts.pending}</b><small>Menunggu</small></div></div></div>}
        </aside>
      </section>

      {showForm && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
        <form className={styles.modal} onSubmit={saveAppointment}>
          <header><div><span className={styles.detailEyebrow}>JADWAL BARU</span><h2>Buat Appointment</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="Tutup">×</button></header>
          <div className={styles.formGrid}>
            <label>Nama kontak *<input required value={form.nama} onChange={(event) => updateForm("nama", event.target.value)} placeholder="Nama pelanggan" /></label>
            <label>Perusahaan<input value={form.company} onChange={(event) => updateForm("company", event.target.value)} placeholder="Nama perusahaan" /></label>
            <label>Nomor telepon *<input required value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="08xxxxxxxxxx" /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="nama@perusahaan.com" /></label>
            <label>Tanggal & waktu *<input required type="datetime-local" value={form.datetime} onChange={(event) => updateForm("datetime", event.target.value)} /></label>
            <label>Durasi<select value={form.duration} onChange={(event) => updateForm("duration", event.target.value)}><option value="15">15 menit</option><option value="30">30 menit</option><option value="45">45 menit</option><option value="60">60 menit</option><option value="90">90 menit</option></select></label>
            <label>Jenis pertemuan<select value={form.type} onChange={(event) => updateForm("type", event.target.value)}>{meetingTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Penanggung jawab<select value={form.sales} onChange={(event) => updateForm("sales", event.target.value)}><option value="">Pilih penanggung jawab</option>{staffList.map((staff) => <option key={staff}>{staff}</option>)}</select></label>
            <label className={styles.fullWidth}>Lokasi / Meeting link<input value={form.location} onChange={(event) => updateForm("location", event.target.value)} placeholder="Alamat atau link Google Meet" /></label>
            <label className={styles.fullWidth}>Catatan<textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} rows={3} placeholder="Agenda atau catatan tambahan" /></label>
          </div>
          <footer><button className={styles.secondaryButton} type="button" onClick={() => setShowForm(false)}>Batal</button><button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Appointment"}</button></footer>
        </form>
      </div>}
    </main>
  );
}
