"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, XCircle, Calendar, Clock, Users } from "lucide-react";

export type Room = {
  id: number;
  name: string;
  capacity: number;
  facilities: string[];
  imageUrl: string | null;
  status: "AVAILABLE" | "WARNING" | "MAINTENANCE";
  statusNote: string | null;
};

interface BookingModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingModal({ room, isOpen, onClose, onSuccess }: BookingModalProps) {
  // ขั้นตอนใน Modal: 'STATUS_CHECK' (ดูแจ้งเตือนก่อน) -> 'BOOKING_FORM' (กรอกเวลาจอง)
  const [step, setStep] = useState<"STATUS_CHECK" | "BOOKING_FORM">("STATUS_CHECK");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!room) return null;

  // รีเซ็ตหน้าต่างทุกครั้งที่ปิด
  const handleClose = () => {
    setStep("STATUS_CHECK");
    setTitle("");
    setErrorMsg("");
    onClose();
  };

  // ฟังก์ชันบันทึกการจองลง Supabase
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title || !date || !startTime || !endTime) {
      setErrorMsg("กรุณากรอกข้อมูลการจองให้ครบถ้วน");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (endDateTime <= startDateTime) {
      setErrorMsg("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("กรุณาเข้าสู่ระบบก่อนทำการจองห้องประชุม");
        window.location.href = "/login";
        return;
      }

      // 1. ตรวจสอบเวลาจองซ้ำซ้อน (Conflict Check)
      const { data: existingBookings, error: checkError } = await supabase
        .from("Booking")
        .select("*")
        .eq("roomId", room.id)
        .eq("bookingStatus", "CONFIRMED")
        .lt("startTime", endDateTime.toISOString())
        .gt("endTime", startDateTime.toISOString());

      if (checkError) throw checkError;

      if (existingBookings && existingBookings.length > 0) {
        setErrorMsg("ช่วงเวลานี้มีผู้จองห้องประชุมนี้แล้ว กรุณาเลือกเวลาอื่น");
        setLoading(false);
        return;
      }

      // 2. บันทึกข้อมูลการจองใหม่
      const { error: insertError } = await supabase.from("Booking").insert([
        {
          roomId: room.id,
          userId: user.id,
          title: title,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          bookingStatus: "CONFIRMED",
        },
      ]);

      if (insertError) throw insertError;

      alert("จองห้องประชุมสำเร็จเรียบร้อย!");
      onSuccess();
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{room.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <Users className="w-4 h-4" /> รองรับสูงสุด {room.capacity} ที่นั่ง
          </DialogDescription>
        </DialogHeader>

        {/* --- หน้าต่างที่ 1: แจ้งเตือนสถานะห้องก่อนกดจอง --- */}
        {step === "STATUS_CHECK" && (
          <div className="space-y-4 py-2">
            {/* รูปภาพตัวอย่างห้อง */}
            {room.imageUrl && (
              <div className="relative h-44 w-full overflow-hidden rounded-lg border">
                <img
                  src={room.imageUrl}
                  alt={room.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            {/* กล่องแจ้งเตือนสถานะตามเงื่อนไขที่แอดมินตั้งไว้ */}
            {room.status === "AVAILABLE" && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>สถานะห้อง: พร้อมใช้งานปกติ</span>
                </div>
                <p className="mt-1 text-sm text-green-700">
                  {room.statusNote || "อุปกรณ์ทุกชิ้นภายในห้องพร้อมใช้งาน"}
                </p>
              </div>
            )}

            {room.status === "WARNING" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-center gap-2 font-semibold text-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span>แจ้งเตือนสถานะห้อง (มีอุปกรณ์ชำรุดบางส่วน)</span>
                </div>
                <p className="mt-2 text-sm font-medium text-amber-900 bg-amber-100/80 p-2.5 rounded">
                  {room.statusNote || "มีอุปกรณ์บางส่วนอยู่ระหว่างซ่อมบำรุง"}
                </p>
                <p className="mt-2 text-xs text-amber-700">
                  * คุณยังสามารถกดดำเนินการจองห้องนี้ได้ตามปกติ หากยอมรับเงื่อนไขข้างต้น
                </p>
              </div>
            )}

            {room.status === "MAINTENANCE" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                <div className="flex items-center gap-2 font-semibold text-red-700">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span>ห้องปิดปรับปรุงชั่วคราว (งดให้บริการ)</span>
                </div>
                <p className="mt-2 text-sm text-red-800">
                  {room.statusNote || "ห้องอยู่ระหว่างการปรับปรุง ไม่สามารถทำรายการจองได้"}
                </p>
              </div>
            )}

            {/* รายการอุปกรณ์ในห้อง */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">อุปกรณ์ภายในห้อง</p>
              <div className="flex flex-wrap gap-1.5">
                {room.facilities?.map((item, index) => (
                  <span
                    key={index}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button variant="outline" onClick={handleClose}>
                ปิดหน้าต่าง
              </Button>
              {room.status !== "MAINTENANCE" && (
                <Button
                  onClick={() => setStep("BOOKING_FORM")}
                  className={
                    room.status === "WARNING"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }
                >
                  {room.status === "WARNING"
                    ? "รับทราบแจ้งเตือน และดำเนินการจองต่อ"
                    : "ดำเนินการจองห้องนี้"}
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

        {/* --- หน้าต่างที่ 2: ฟอร์มกรอกรายละเอียดเวลาจอง --- */}
        {step === "BOOKING_FORM" && (
          <form onSubmit={handleConfirmBooking} className="space-y-4 py-2">
            {errorMsg && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">หัวข้อการประชุม *</Label>
              <Input
                id="title"
                placeholder="เช่น ประชุมสรุปความคืบหน้าโปรเจกต์ประจำสัปดาห์"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> วันที่ต้องการจอง *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> เวลาเริ่ม *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> เวลาสิ้นสุด *
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("STATUS_CHECK")}>
                ย้อนกลับ
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "กำลังตรวจสอบเวลา..." : "ยืนยันการจองห้องประชุม"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}