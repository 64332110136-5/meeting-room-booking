"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Room } from "@/components/BookingModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Plus,
  Upload,
  Trash2,
  Edit,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarX,
} from "lucide-react";

type AdminBookingItem = {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  bookingStatus: "CONFIRMED" | "CANCELLED";
  Room: { name: string };
  User: { fullName: string; department: string | null };
};

export default function AdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal เพิ่ม/แก้ไขห้องประชุม
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [facilitiesText, setFacilitiesText] = useState("");
  const [status, setStatus] = useState<Room["status"]>("AVAILABLE");
  const [statusNote, setStatusNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // ดึงข้อมูลห้องประชุมและรายการจองทั้งหมด
  const fetchAdminData = async () => {
    setLoading(true);
    const { data: roomsData } = await supabase
      .from("Room")
      .select("*")
      .order("id", { ascending: true });

    const { data: bookingsData } = await supabase
      .from("Booking")
      .select("id, title, startTime, endTime, bookingStatus, Room(name), User(fullName, department)")
      .order("startTime", { ascending: false });

    if (roomsData) setRooms(roomsData as Room[]);
    if (bookingsData) setBookings(bookingsData as any);
    setLoading(false);
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("User")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "ADMIN") {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ");
        window.location.href = "/";
        return;
      }

      fetchAdminData();
    };

    checkAdminAccess();
  }, []);

  // เปิดหน้าต่างเพิ่มห้องใหม่
  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setName("");
    setCapacity("10");
    setFacilitiesText("โปรเจกเตอร์, ไวท์บอร์ด, เครื่องปรับอากาศ");
    setStatus("AVAILABLE");
    setStatusNote("ห้องพร้อมใช้งานปกติ");
    setImageUrl("");
    setImageFile(null);
    setIsModalOpen(true);
  };

  // เปิดหน้าต่างแก้ไขห้องและสถานะแจ้งเตือน
  const handleOpenEditModal = (room: Room) => {
    setEditingRoom(room);
    setName(room.name);
    setCapacity(String(room.capacity));
    setFacilitiesText(room.facilities ? room.facilities.join(", ") : "");
    setStatus(room.status);
    setStatusNote(room.statusNote || "");
    setImageUrl(room.imageUrl || "");
    setImageFile(null);
    setIsModalOpen(true);
  };

  // อัปโหลดรูปภาพขึ้น Supabase Storage (Bucket: room-images)
  const uploadRoomImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `room-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("room-images")
      .upload(fileName, file);

    if (uploadError) {
      throw new Error("อัปโหลดรูปภาพไม่สำเร็จ: " + uploadError.message);
    }

    const { data } = supabase.storage.from("room-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  // บันทึกข้อมูลห้องประชุม (เพิ่มใหม่ หรือ อัปเดต)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      // ถ้ามีการเลือกไฟล์รูปใหม่ ให้อัปโหลดขึ้น Storage ก่อน
      if (imageFile) {
        const uploadedUrl = await uploadRoomImage(imageFile);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      // แปลงข้อความอุปกรณ์คั่นด้วยลูกน้ำให้เป็น Array
      const facilitiesArray = facilitiesText
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

      const roomPayload = {
        name,
        capacity: Number(capacity),
        facilities: facilitiesArray,
        status,
        statusNote: statusNote.trim() || null,
        imageUrl: finalImageUrl || null,
        updatedAt: new Date().toISOString(),
      };

      if (editingRoom) {
        // อัปเดตข้อมูลห้องเดิม
        const { error } = await supabase
          .from("Room")
          .update(roomPayload)
          .eq("id", editingRoom.id);
        if (error) throw error;
      } else {
        // เพิ่มห้องประชุมใหม่
        const { error } = await supabase.from("Room").insert([roomPayload]);
        if (error) throw error;
      }

      alert(editingRoom ? "อัปเดตสถานะและข้อมูลห้องสำเร็จ!" : "เพิ่มห้องประชุมใหม่สำเร็จ!");
      setIsModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  };

  // ลบห้องประชุม
  const handleDeleteRoom = async (roomId: number, roomName: string) => {
    if (!confirm(`ยืนยันการลบ "${roomName}" ใช่หรือไม่? (รายการจองของห้องนี้จะถูกลบด้วย)`)) return;

    const { error } = await supabase.from("Room").delete().eq("id", roomId);
    if (error) {
      alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
    } else {
      fetchAdminData();
    }
  };

  // ยกเลิกรายการจอง
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm("ต้องการยกเลิกรายการจองนี้ใช่หรือไม่?")) return;

    const { error } = await supabase
      .from("Booking")
      .update({ bookingStatus: "CANCELLED" })
      .eq("id", bookingId);

    if (error) {
      alert("ยกเลิกไม่สำเร็จ: " + error.message);
    } else {
      fetchAdminData();
    }
  };

  const renderStatusBadge = (roomStatus: Room["status"]) => {
    switch (roomStatus) {
      case "AVAILABLE":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมใช้งาน
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" /> มีแจ้งเตือนอุปกรณ์
          </Badge>
        );
      case "MAINTENANCE":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 w-fit">
            <XCircle className="w-3.5 h-3.5" /> ปิดปรับปรุง
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar ฝั่งแอดมิน */}
      <header className="bg-slate-900 text-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <h1 className="font-bold text-lg">ระบบจัดการหลังบ้าน (Admin Dashboard)</h1>
          </div>
          <a
            href="/"
            className="text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-md flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าจองห้องประชุม
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* ส่วนที่ 1: จัดการห้องประชุมและข้อความแจ้งเตือนก่อนจอง */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">จัดการห้องประชุมและสถานะแจ้งเตือน</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                อัปเดตรูปภาพ สถานะความพร้อม และข้อความแจ้งเตือนอุปกรณ์เสียที่จะแสดงให้ผู้ใช้เห็นก่อนกดจอง
              </p>
            </div>
            <Button onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> เพิ่มห้องประชุมใหม่
            </Button>
          </div>

          {loading ? (
            <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">รูปห้อง</th>
                    <th className="py-3 px-4 font-semibold">ชื่อห้อง / ความจุ</th>
                    <th className="py-3 px-4 font-semibold">สถานะปัจจุบัน</th>
                    <th className="py-3 px-4 font-semibold">ข้อความแจ้งเตือนก่อนจอง</th>
                    <th className="py-3 px-4 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="w-20 h-14 rounded overflow-hidden bg-slate-200 border">
                          {room.imageUrl ? (
                            <img
                              src={room.imageUrl}
                              alt={room.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                              ไม่มีรูป
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{room.name}</p>
                        <p className="text-xs text-slate-500">ความจุ {room.capacity} ที่นั่ง</p>
                      </td>
                      <td className="py-3 px-4">{renderStatusBadge(room.status)}</td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {room.statusNote || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(room)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> แก้ไข / แจ้งเตือน
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ส่วนที่ 2: จัดการรายการจองทั้งหมด */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">รายการจองห้องประชุมทั้งหมด</h2>

          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500">ยังไม่มีรายการจองในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="py-3 px-4 font-semibold">ห้องประชุม</th>
                    <th className="py-3 px-4 font-semibold">หัวข้อการประชุม</th>
                    <th className="py-3 px-4 font-semibold">วัน-เวลา</th>
                    <th className="py-3 px-4 font-semibold">ผู้จอง</th>
                    <th className="py-3 px-4 font-semibold">สถานะ</th>
                    <th className="py-3 px-4 font-semibold text-right">คำสั่ง</th>
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
                      <td className="py-3 px-4">
                        {b.bookingStatus === "CONFIRMED" ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">ยืนยันแล้ว</Badge>
                        ) : (
                          <Badge variant="secondary">ยกเลิกแล้ว</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.bookingStatus === "CONFIRMED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancelBooking(b.id)}
                          >
                            <CalendarX className="w-3.5 h-3.5 mr-1" /> ยกเลิกการจอง
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Modal เพิ่ม / แก้ไขข้อมูลห้องประชุมและข้อความแจ้งเตือน */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? `แก้ไขข้อมูล: ${editingRoom.name}` : "เพิ่มห้องประชุมใหม่"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveRoom} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="roomName">ชื่อห้องประชุม *</Label>
              <Input
                id="roomName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ห้องประชุมชั้น 2 (Meeting Room B)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="capacity">ความจุ (ที่นั่ง) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>สถานะห้องประชุม *</Label>
                <Select
                  value={status}
                  onValueChange={(val: Room["status"]) => setStatus(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานะห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">พร้อมใช้งานปกติ (สีเขียว)</SelectItem>
                    <SelectItem value="WARNING">มีอุปกรณ์ชำรุด/แจ้งเตือน (สีเหลือง)</SelectItem>
                    <SelectItem value="MAINTENANCE">ปิดปรับปรุง งดจอง (สีแดง)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ช่องพิมพ์ข้อความแจ้งเตือนก่อนจอง */}
            <div className="space-y-1.5">
              <Label htmlFor="statusNote" className="text-amber-700 font-semibold">
                ข้อความแจ้งเตือนสถานะห้อง (จะเด้งให้ผู้ใช้เห็นก่อนกดจอง)
              </Label>
              <Textarea
                id="statusNote"
                rows={3}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="เช่น ห้องพร้อมใช้งาน 100% หรือ แจ้งเตือน: ไมค์ลอยตัวที่ 2 แบตเสื่อม กรุณาใช้ไมค์สายสำรอง"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="facilities">อุปกรณ์ภายในห้อง (คั่นด้วยเครื่องหมายจุลภาค ,)</Label>
              <Input
                id="facilities"
                value={facilitiesText}
                onChange={(e) => setFacilitiesText(e.target.value)}
                placeholder="เช่น โปรเจกเตอร์, ไวท์บอร์ด, แอร์, ระบบซูม"
              />
            </div>

            {/* อัปโหลดรูปภาพห้องประชุม */}
            <div className="space-y-1.5">
              <Label htmlFor="roomImage" className="flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> อัปโหลดรูปภาพตัวอย่างห้องประชุม
              </Label>
              <Input
                id="roomImage"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
              />
              {imageUrl && !imageFile && (
                <p className="text-xs text-slate-500 truncate">รูปปัจจุบัน: {imageUrl}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูล"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}