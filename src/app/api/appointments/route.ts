import { errMsg, fail, ok, readJson } from '@/server/http';
import { state } from '@/server/state';
import { apptSave } from '@/server/store';
import { apptTypeLabel } from '@/server/appointments';
import type { AiAppointment } from '@/server/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mengambil seluruh appointment milik organisasi aktif.
export async function GET() {
  return ok({
    appointments: state.aiAppointments,
  });
}

// Membuat appointment secara manual.
export async function POST(req: Request) {
  try {
    const body = await readJson(req);

    const nama = String(body.nama ?? '').trim();

    if (!nama) {
      return fail('Nama kontak wajib diisi', 400);
    }

    const date = String(body.date ?? '').trim();
    const time = String(body.time ?? '').trim();

    if (!date || !time) {
      return fail('Tanggal dan waktu appointment wajib diisi', 400);
    }

    const type = String(body.type ?? 'konsultasi');

    const appointment: AiAppointment = {
      id: `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nama,
      company: String(body.company ?? '').trim(),
      phone: String(body.phone ?? '').trim(),
      email: String(body.email ?? '').trim(),
      date,
      time,
      duration: Number(body.duration) || 60,
      type,
      typeLabel: String(body.typeLabel ?? apptTypeLabel(type)),
      sales: String(body.sales ?? ''),
      status: 'menunggu',
      createdBy: 'manual',
      location: String(body.location ?? ''),
      notes: String(body.notes ?? ''),
      aiNote: '',
      chatId: null,
      leadId: null,
      timeline: [
        {
          type: 'success',
          event: 'Appointment dibuat secara manual',
          sub: 'Dibuat melalui halaman Appointment',
          time: 'Baru saja',
        },
      ],
    };

    state.aiAppointments.push(appointment);
    apptSave();

    return ok({ appointment });
  } catch (err) {
    console.error('[Appointments API] Gagal:', err);
    return fail(errMsg(err));
  }
}