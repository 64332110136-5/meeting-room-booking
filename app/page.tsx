"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BookingModal, Room } from "@/components/BookingModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

type BookingItem = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  Room: { name: string };
  User: { fullName: string };
};

export default function HomePage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลห้องประชุมและรายการจองล่าสุดจาก Supabase
  const fetchData = async () => {
    setLoading(true);
    const { data: roomsData } = await supabase
      .from("Room")
      .select("*")
      .order("id", { ascending: true });

    const { data: bookingsData } = await supabase
      .from("Booking")
      .select("id, title, startTime, endTime, Room(name), User(fullName)")
      .eq("bookingStatus", "CONFIRMED")
      .order("startTime", { ascending: true });

    if (roomsData) setRooms(roomsData as Room[]);
    if (bookingsData) setBookings(bookingsData as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  // ฟังก์ชันแสดงป้ายสถานะบนการ์ดห้องประชุม
  const renderStatusBadge = (status: Room["status"]) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> มีแจ้งเตือนอุปกรณ์
          </Badge>
        );
      case "MAINTENANCE":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> ปิดปรับปรุง
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* แถบเมนูด้านบน (Navbar) */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-blue-600" />
            <h1 className="font-bold text-lg text-slate-800">ระบบจองห้องประชุมออนไลน์</h1>
          </div>
          <a
            href="/admin"
            className="text-sm font-medium text-slate-600 hover:text-blue-600 border px-3 py-1.5 rounded-md transition"
          >
            เข้าสู่หน้าแอดมิน
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* ส่วนที่ 1: รายการห้องประชุมทั้งหมด */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">เลือกห้องประชุมที่ต้องการจอง</h2>
            <p className="text-slate-500 text-sm mt-1">
              คลิกที่ห้องประชุมเพื่อตรวจสอบสถานะความพร้อมและอุปกรณ์ก่อนทำการจอง
            </p>
          </div>

          {loading ? (
            <p className="text-slate-500">กำลังโหลดข้อมูลห้องประชุม...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* รูปภาพห้อง */}
                    <div className="relative h-48 w-full bg-slate-200">
                      {room.imageUrl ? (
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          ไม่มีรูปภาพ
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        {renderStatusBadge(room.status)}
                      </div>
                    </div>

                    {/* รายละเอียดห้อง */}
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-slate-800">{room.name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <Users className="w-4 h-4" /> ความจุ {room.capacity} ที่นั่ง
                      </p>

                      {/* แสดงข้อความแจ้งเตือนย่อบนการ์ดถ้ามีอุปกรณ์เสีย */}
                      {room.status !== "AVAILABLE" && room.statusNote && (
                        <div
                          className={`mt-3 p-2.5 rounded-md text-xs line-clamp-2 ${
                            room.status === "WARNING"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {room.statusNote}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ปุ่มกดตรวจสอบและจอง */}
                  <div className="p-5 pt-0">
                    <Button
                      onClick={() => handleOpenRoom(room)}
                      className="w-full"
                      variant={room.status === "MAINTENANCE" ? "secondary" : "default"}
                    >
                      {room.status === "MAINTENANCE"
                        ? "ดูรายละเอียดการปิดปรับปรุง"
                        : "ตรวจสอบสถานะและจองห้อง"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ส่วนที่ 2: ตารางรายการจองที่ยืนยันแล้ว */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> รายการจองห้องประชุมล่าสุด
          </h2>

          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">ยังไม่มีรายการจองในขณะนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">ห้องประชุม</th>
                    <th className="py-3 px-4 font-semibold">หัวข้อการประชุม</th>
                    <th className="py-3 px-4 font-semibold">วัน-เวลาที่จอง</th>
                    <th className="py-3 px-4 font-semibold">ผู้จอง</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-800">{b.Room?.name}</td>
                      <td className="py-3 px-4 text-slate-700">{b.title}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(b.startTime).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        |{" "}
                        {new Date(b.startTime).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(b.endTime).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        น.
                      </td>
                      <td className="py-3 px-4 text-slate-600">{b.User?.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* หน้าต่าง Pop-up แจ้งเตือนสถานะห้องและฟอร์มจอง */}
      <BookingModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}