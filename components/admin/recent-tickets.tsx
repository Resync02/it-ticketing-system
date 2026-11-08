
import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";

const tickets = [
  {
    id: "IT-20261029-005",
    name: "Andi Pratama",
    division: "Engineering",
    device: "Laptop",
    issue: "Laptop tidak bisa menyala",
    priority: "Tinggi",
    status: "Sedang dikerjakan",
    statusKey: "progress",
    time: "10.25 WIB",
  },
  {
    id: "IT-20261029-004",
    name: "Siti Rahma",
    division: "Finance",
    device: "Printer",
    issue: "Printer tidak terdeteksi",
    priority: "Medium",
    status: "Belum dikerjakan",
    statusKey: "open",
    time: "10.10 WIB",
  },
  {
    id: "IT-20261029-003",
    name: "Budi Santoso",
    division: "HRGA",
    device: "Komputer",
    issue: "Komputer berjalan lambat",
    priority: "Rendah",
    status: "Sedang dikerjakan",
    statusKey: "progress",
    time: "09.45 WIB",
  },
  {
    id: "IT-20261029-002",
    name: "Dewi Anggraini",
    division: "Accounting & Tax",
    device: "Scanner",
    issue: "Scanner gagal membaca dokumen",
    priority: "Rendah",
    status: "Selesai",
    statusKey: "completed",
    time: "09.20 WIB",
  },
  {
    id: "IT-20261029-001",
    name: "Rizky Firmansyah",
    division: "Business Development",
    device: "Laptop",
    issue: "Tidak bisa terhubung ke Wi-Fi",
    priority: "Belum ditentukan",
    status: "Menunggu persetujuan",
    statusKey: "pending",
    time: "08.50 WIB",
  },
];

const statusStyles: Record<string, string> = {
  progress: "bg-blue-50 text-blue-700 ring-blue-600/20",
  open: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default function RecentTickets() {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div>
          <h3 className="font-semibold text-[#172B4D]">
            Tiket Terbaru
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan pengajuan dan progres penanganan.
          </p>
        </div>

        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Lihat semua
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3.5 font-medium">ID / Pelapor</th>
              <th className="px-4 py-3.5 font-medium">Masalah</th>
              <th className="px-4 py-3.5 font-medium">Prioritas</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
              <th className="px-4 py-3.5 font-medium">Waktu</th>
              <th className="px-6 py-3.5 text-right font-medium">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-6 py-4">
                  <p className="whitespace-nowrap font-medium text-[#172B4D]">
                    {ticket.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.name} · {ticket.division}
                  </p>
                </td>

                <td className="max-w-[220px] px-4 py-4">
                  <p className="font-medium text-slate-700">
                    {ticket.issue}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ticket.device}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      ticket.priority === "Tinggi"
                        ? "bg-red-50 text-red-700"
                        : ticket.priority === "Medium"
                          ? "bg-amber-50 text-amber-700"
                          : ticket.priority === "Rendah"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[ticket.statusKey]}`}
                  >
                    {ticket.status}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                  {ticket.time}
                </td>

                <td className="px-6 py-4 text-right">
                  <Link
                    href="/admin/tickets"
                    aria-label={`Lihat tiket ${ticket.id}`}
                    className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Eye size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-6 py-3">
        <p className="text-xs text-slate-500">
          Menampilkan 5 tiket contoh.
        </p>
      </div>
    </section>
  );
}