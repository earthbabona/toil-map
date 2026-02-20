# Toil Map (MVP)

Mobile app MVP สำหรับค้นหาห้องน้ำที่ใกล้และใช้งานได้จริงตามโครงสร้าง PRD ที่กำหนด

## สิ่งที่ทำในเวอร์ชันนี้
- Map + near me + emergency action
- Filters หลัก: free/paid, open now, wheelchair, water, baby changing
- Toilet detail: last verified + trust score + navigate/check-in/report
- Quick check-in: open/closed, cleanliness, required code/must pay/must buy
- Add toilet flow แบบ 30 วินาที พร้อมแนบรูป
- trust score และ last_verified อัปเดตเมื่อ check-in

## Run
```bash
npm install
npm run typecheck
npm run start
```

> หมายเหตุ: ปุ่ม Navigate ใน MVP นี้เป็น placeholder alert เพื่อให้ทีมเชื่อม deep link ไป Google/Apple Maps ต่อในสเต็ปถัดไป
