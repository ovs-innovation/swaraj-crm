# Vastora CRM — 3 Roles Guide (Hindi + English)

## Roles Overview

| Role | Login URL | Kya kar sakta hai |
|------|-----------|-------------------|
| **Admin** | `/admin` | Sab kuch — managers, dealers, approvals, reports, settings |
| **Area Manager** | `/area-manager` | Sirf assigned dealers — visit, upload, update dealer info |
| **Dealer** | `/dealer` | Sirf apna profile, approved posts, visit history (read-only) |

---

## Demo Logins (Seed ke baad)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vastora.com | admin123 |
| Area Manager | rajesh@vastora.com | manager123 |
| Area Manager | suresh@vastora.com | manager123 |
| Dealer | amit@vastora.com | dealer123 |

---

## Setup Steps (Pehli baar)

### Step 1 — Server start karo
```bash
cd "c:\Users\drist\Desktop\swaraj crm"
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:5000/api

### Step 2 — Database seed (demo data)
```bash
cd server
npm run seed
```

### Step 3 — Browser mein login karo
http://localhost:5173 par jao aur role ke hisaab se login karo.

---

## Admin — Step by Step Workflow

### 1. Area Manager banana
1. Login: `admin@vastora.com` / `admin123`
2. Sidebar → **Area Managers**
3. **Add Manager** click karo
4. Name, Employee ID, Email, Mobile, State, District, Password bharo
5. Save — Area Manager ab login kar sakta hai

### 2. Dealer banana
1. Sidebar → **Dealers** → **Add Dealer**
2. Dealer details bharo (name, code, contact, state, district...)
3. **Area Manager** select karo
4. (Optional) **Dealer Login Email + Password** — dealer ko CRM access milega
5. Save

### 3. Existing dealer ko login dena
1. **Dealers** list mein → **Create Login** button
2. Email + Password set karo
3. Dealer ab login kar sakta hai

### 4. Dealer assign / reassign
1. Dealer row mein **Assign** click karo
2. Naya Area Manager select karo
3. Assignment history automatically save hoti hai

### Media / Posts Workflow (Updated)

```
Admin → Uploads marketing posts (auto-approved, sab dealers ke liye)
Dealer → Kabhi video/photo upload (location ke sath) → Status: Pending
Area Manager → Dealer uploads approve/reject karta hai
Admin → Sab kuch dekhta hai + delete + override approve
```

### 5. Admin posts upload karna
1. **Posts & Media** → **Upload Post**
2. Dealer select karo, file + description
3. Post turant **approved** ho jata hai (marketing ke liye)

### 5b. Dealer uploads approve (Admin view)
- Admin bhi saari pending dealer uploads dekh aur approve kar sakta hai

### 4. Media approve karna (Area Manager)
1. Dealer video/photo upload karta hai
2. Area Manager → **Approve Uploads**
3. Pending dealer uploads dekho → **Approve** ya **Reject**

### Dealer upload karna
1. **Upload Video** → location likho (shop, mela, demo site)
2. Video/photo choose karo
3. Area Manager approve karega
4. **Approved Posts** mein dikhega

### 6. Reports & Audit
- **Reports** — dealer, visit, upload, state-wise, area-wise + CSV export
- **Audit Logs** — sab actions track hote hain

---

## Area Manager — Step by Step Workflow

### 1. Login
`rajesh@vastora.com` / `manager123`

### 2. Assigned dealers dekho
- Sidebar → **My Dealers**
- Sirf aapke assigned dealers dikhenge

### 3. Dealer visit record karo
1. **Visits** → **New Visit**
2. Dealer select karo, date/time, notes likho
3. Visit **Complete** mark karo jab done ho

### 4. Media upload karo
1. **Uploads** → **Upload Media**
2. Dealer select karo, file choose karo (image/video/document)
3. Upload — status **Pending** rahega jab tak Admin approve na kare

### 5. Dealer info update
- **My Dealers** → **Edit** — contact, address etc. update kar sakte ho
- Dealer **create** ya **delete** nahi kar sakte

---

## Dealer — Step by Step Workflow

### 1. Login
`amit@vastora.com` / `dealer123`

### 2. Dashboard
- Apna dealer name, area manager
- Approved posts count, visits count

### 3. My Profile
- Apni dealer details (read-only)
- Visit history
- Approved posts

### 4. Approved Posts
- Sirf **approved** media dikhega
- Pending/rejected nahi dikhega

### 5. Kya NAHI kar sakta
- Koi dealer create/edit/delete
- Media upload
- Visit create
- Doosre dealers dekhna
- Settings / Reports / Admin pages

---

## Complete Business Flow

```
Admin
  ↓ Area Manager create
  ↓ Dealer create + Area Manager assign
  ↓ (Optional) Dealer login create
  ↓
Area Manager
  ↓ Assigned dealers dekhe
  ↓ Visit record kare
  ↓ Photos/videos upload kare
  ↓
Admin
  ↓ Media review + Approve
  ↓
Dealer
  ↓ Apna profile + approved posts dekhe
```

---

## Permission Matrix

| Feature | Admin | Area Manager | Dealer |
|---------|:-----:|:------------:|:------:|
| Dashboard | ✅ | ✅ | ✅ |
| Manage Area Managers | ✅ | ❌ | ❌ |
| Create Dealers | ✅ | ❌ | ❌ |
| View Dealers | All | Assigned | Self only |
| Edit Dealers | ✅ | Assigned | ❌ |
| Assign Dealers | ✅ | ❌ | ❌ |
| Create Visits | ✅ | ✅ | ❌ |
| View Visits | All | Own | Own |
| Upload Media | ✅ | ✅ | ❌ |
| Approve Media | ✅ | ❌ | ❌ |
| View Media | All | Own dealers | Approved only |
| Reports | Full | Limited | ❌ |
| Settings | ✅ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ |

---

## Naya Dealer User manually banana (Admin)

**Option A — Dealer create karte waqt:**
Add Dealer form mein "Dealer Login Email" aur "Password" bharo.

**Option B — Baad mein:**
Dealers list → **Create Login** → email/password set karo.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Login fail | `npm run seed` dubara chalao |
| Dealer dashboard empty | Admin se dealer login create karo aur `dealerRef` link ho |
| Media dealer ko nahi dikh raha | Admin se **Approve** karna zaroori hai |
| Port 5000 busy | Purana server band karo, `npm run dev` dubara chalao |
