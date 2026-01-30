

## Add Show/Hide Password Toggle to Edit Owner Dialog

### Overview
Add an eye icon toggle to the password field in the "Edit Owner Account" dialog on the System Admin page. This will allow system admins to reveal the password while typing for verification purposes.

### Changes Required

#### 1. Update SystemAdmin.tsx

**Add State for Password Visibility**
- Add a new state variable: `showEditOwnerPassword` (boolean, default: `false`)

**Add Icon Import**
- Import `Eye` and `EyeOff` icons from `lucide-react`

**Modify Password Input Field**
- Wrap the password input in a `relative` container
- Change input type from static `"password"` to dynamic based on state: `showEditOwnerPassword ? "text" : "password"`
- Add a clickable icon button (Eye/EyeOff) positioned absolutely on the left side of the input (RTL layout)
- Add padding to the input to accommodate the icon

### Technical Details

**Current Password Field (lines 1324-1335):**
```tsx
<div>
  <Label htmlFor="edit-owner-password" ...>{t('password')}</Label>
  <Input
    id="edit-owner-password"
    type="password"
    className="py-2 px-3 h-9"
    value={newOwnerPassword}
    onChange={(e) => setNewOwnerPassword(e.target.value)}
    placeholder="••••••••"
  />
  <p className="text-xs ...">{t('sa_new_password_hint')}</p>
</div>
```

**Updated Password Field:**
```tsx
<div>
  <Label htmlFor="edit-owner-password" ...>{t('password')}</Label>
  <div className="relative">
    <Input
      id="edit-owner-password"
      type={showEditOwnerPassword ? "text" : "password"}
      className="py-2 px-3 h-9 pr-10"
      value={newOwnerPassword}
      onChange={(e) => setNewOwnerPassword(e.target.value)}
      placeholder="••••••••"
    />
    <button
      type="button"
      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      onClick={() => setShowEditOwnerPassword(!showEditOwnerPassword)}
      tabIndex={-1}
    >
      {showEditOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
  <p className="text-xs ...">{t('sa_new_password_hint')}</p>
</div>
```

**Note on RTL Layout:** Since the interface is in Arabic (RTL), the icon will appear on the left side visually, which is the standard position for password visibility toggles in RTL layouts.

### Files to Modify
- `src/pages/SystemAdmin.tsx`

### No Changes Required
- No backend changes
- No new components needed
- No localization updates needed

