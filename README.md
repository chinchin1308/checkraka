# Check Raka — เช็กราคา

เว็บค้นหาราคาวัสดุก่อสร้างรายเดือนจาก TPSO แบบ bento cards พร้อมมุมมองตาราง ค้นหา เรียงราคา แบ่งหน้า และดาวน์โหลด CSV

เว็บ: https://chinchin1308.github.io/checkraka/

## โครงสร้าง

- `index.html` — HTML, CSS และ JavaScript ในไฟล์เดียว ไม่ต้อง build
- `.nojekyll` — เผยแพร่ไฟล์ static โดยไม่ใช้ Jekyll

GitHub Pages ให้บริการหน้า HTML ส่วน API proxy ทำงานที่ https://tpso-material-prices.awarekoala2.chatgpt.site โดยเปิด CORS สำหรับ https://chinchin1308.github.io

## เปิด GitHub Pages

Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: / (root) → Save

หน้าเว็บโหลดจังหวัดและช่วงข้อมูลล่าสุดจาก TPSO แล้วดึงราคาตามพื้นที่/เดือนที่เลือก จึงไม่ต้องอัปโหลดราคาด้วยตนเอง เมื่อผู้ให้บริการต้นทางมีปัญหา เว็บจะแสดงข้อความให้ลองใหม่

API ของ proxy:

- `GET /api/master`
- `GET /api/prices?year=2567&month=3&type=14`

Backend แคชข้อมูลในหน่วยความจำสูงสุด 24 ชั่วโมง และ HTTP cache 5 นาที หากย้าย repository ไปบัญชี GitHub อื่น ต้องอัปเดต origin ที่อนุญาตใน backend และ API URL ในหน้า HTML หากย้าย backend

CSV ส่งออกทุกรายการที่ตรงกับคำค้น รหัสสินค้าเป็นข้อความและอาจมีเลขศูนย์นำหน้า ราคา VAT แสดงค่าจาก priceVAT ของ TPSO โดยตรง ไม่มีการคำนวณเพิ่มเอง

แหล่งข้อมูล: https://index.tpso.go.th/document/csi/post-month และ https://index.tpso.go.th/document/csi/get-month

เครื่องมือค้นหาอิสระ ไม่ใช่เว็บไซต์ทางการของ TPSO
