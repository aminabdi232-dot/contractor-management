<?php
declare(strict_types=1);
session_start();
header('X-Content-Type-Options: nosniff');
$privateConfig = dirname(__DIR__) . '/engcore-config.php';
$lockFile = dirname(__DIR__) . '/engcore-installed.lock';
if (is_file($privateConfig) || is_file($lockFile)) {
 http_response_code(403);
 exit('سامانه قبلاً راه‌اندازی شده است. برای امنیت، فایل نصب را حذف کنید.');
}
$error = '';
$success = false;
if (empty($_SESSION['install_csrf'])) $_SESSION['install_csrf'] = bin2hex(random_bytes(32));
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
 if (!hash_equals($_SESSION['install_csrf'] ?? '', (string)($_POST['install_csrf'] ?? ''))) { http_response_code(419); exit('درخواست نامعتبر است. صفحه را تازه‌سازی کنید.'); }
 $dbName = 'engcor_first';
 $dbUser = 'engcor_amin';
 $dbPass = (string)($_POST['db_password'] ?? '');
 $adminPass = (string)($_POST['admin_password'] ?? '');
 $secondPass = (string)($_POST['second_password'] ?? '');
 if (strlen($dbPass) < 1 || strlen($adminPass) < 8 || strlen($secondPass) < 8) {
  $error = 'رمز دیتابیس را وارد کنید و برای هر دو حساب کاربری رمز حداقل ۸ نویسه‌ای تعیین کنید.';
 } else {
  try {
   $pdo = new PDO("mysql:host=localhost;dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
   ]);
   $schemaPath = __DIR__ . '/migration/schema.sql';
   if (!is_file($schemaPath)) throw new RuntimeException('فایل ساختار دیتابیس پیدا نشد.');
   $sql = file_get_contents($schemaPath);
   foreach (preg_split('/;\s*(?:\r?\n|$)/', $sql) as $statement) {
    if (trim($statement) !== '') $pdo->exec($statement);
   }
   $users = [
    ['7aa7a31e-0ed2-4c12-911c-c647393d08e0','aminabdi232@gmail.com','aminabdi232@gmail.com',null,password_hash($adminPass,PASSWORD_DEFAULT),'امین عبدی','مدیر سامانه',1,1,'2026-10-25 11:25:38.084728','2026-10-25 11:25:38.084728'],
    ['9c18f221-0632-460e-ae2f-b1356f0dce61','+989399929110',null,'+989399929110',password_hash($secondPass,PASSWORD_DEFAULT),'امین طاهونه چی','رفیق صمیمی',1,1,'2026-11-01 10:58:23.572001','2026-11-07 16:48:36.740686']
   ];
   $stmt = $pdo->prepare('INSERT IGNORE INTO app_profiles (id,username,email,phone,password_hash,full_name,job_title,is_admin,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
   foreach ($users as $u) $stmt->execute($u);

   $pdo->prepare("INSERT IGNORE INTO company_projects (id,code,name,client_name,contract_amount,status,start_date,end_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    ->execute(['934ede5a-4986-4650-bf42-06157f4f3174','2250','الغدیر','مسکن غدیر','100000.00','active','2026-10-06','2027-06-25',null,'2026-10-25 11:32:33.240591','2026-10-25 11:32:33.240591']);
   $pdo->prepare("INSERT IGNORE INTO company_employees (id,employee_no,full_name,phone,job_title,project_id,employment_status,hire_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    ->execute(['e1dee264-0cba-4efe-a973-651fddf12ccd','2235','امین عبدی','09122713659','مدیر مهندسی','934ede5a-4986-4650-bf42-06157f4f3174','active','2026-10-01','2026-10-25 11:33:08.672229','2026-10-25 11:33:08.672229']);
   $pdo->prepare("INSERT IGNORE INTO payroll_entries (id,employee_id,project_id,period_year,period_month,base_amount,overtime_amount,bonuses,deductions,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    ->execute(['1de84f30-ffb2-45d7-a58d-6350f124fd6c','e1dee264-0cba-4efe-a973-651fddf12ccd','934ede5a-4986-4650-bf42-06157f4f3174',1405,1,'50000000.00','0.00','0.00','0.00','draft',null,'2026-10-25 11:33:23.330134','2026-10-25 11:33:23.330134']);
   $catalog = [
    ['430cc1b0-a262-40da-9e02-4d89e9a469f9','projects',null,'project','پروژه محمدیه قزوین',1,'2026-11-07 16:52:56.688562'],
    ['7b3c425e-b17a-4a60-9804-002abb6118b1','projects',null,'project','پروژه الغدیر یافت‌آباد',2,'2026-11-07 16:52:56.688562'],
    ['74f0345a-4450-4312-b872-3e4b66018bb0','projects',null,'project','پروژه حوض سلطان',3,'2026-11-07 16:52:56.688562']
   ];
   $catStmt=$pdo->prepare('INSERT IGNORE INTO module_catalog (id,module,parent_id,node_type,name,sort_order,created_at) VALUES (?,?,?,?,?,?,?)');
   foreach($catalog as $item)$catStmt->execute($item);
   $pdo->prepare("INSERT IGNORE INTO app_settings (setting_key,setting_value,updated_by,updated_at) VALUES ('appearance',?,?,?)")
    ->execute([json_encode(['theme'=>'blue'],JSON_UNESCAPED_UNICODE),'9c18f221-0632-460e-ae2f-b1356f0dce61','2026-11-07 17:34:52.657000']);

   $config = "<?php\nreturn " . var_export(['db_host'=>'localhost','db_name'=>$dbName,'db_user'=>$dbUser,'db_pass'=>$dbPass], true) . ";\n";
   if (file_put_contents($privateConfig, $config, LOCK_EX) === false) throw new RuntimeException('ذخیره تنظیمات اتصال دیتابیس انجام نشد.');
   @chmod($privateConfig,0600);
   file_put_contents($lockFile, date('c'));
   @chmod($lockFile,0600);
   $success = true;
  } catch (Throwable $e) {
   if (isset($privateConfig) && is_file($privateConfig)) @unlink($privateConfig);
   $error = 'راه‌اندازی کامل نشد: ' . htmlspecialchars($e->getMessage(),ENT_QUOTES,'UTF-8');
  }
 }
}
?><!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>راه‌اندازی سامانه امین عبدی</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#071b14;color:#e8fff3;font-family:Tahoma,sans-serif;display:grid;place-items:center;padding:20px}.card{width:min(560px,100%);background:#102a20;border:1px solid #28785a;border-radius:20px;padding:28px;box-shadow:0 18px 60px #0008}h1{font-size:23px;margin:0 0 12px;color:#a7f3d0}p{line-height:2;color:#b7d7c8;font-size:13px}label{display:block;margin:16px 0 7px;font-size:13px;color:#d8fbe8}input{width:100%;padding:13px;border:1px solid #376b56;border-radius:10px;background:#071b14;color:#fff;font:14px Tahoma}button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:10px;background:#34d399;color:#052e22;font-weight:bold;font-size:15px;cursor:pointer}.error{color:#fecaca;background:#4a1720;padding:12px;border-radius:10px}.success{color:#bbf7d0;background:#123d2b;padding:14px;border-radius:10px;line-height:2}.note{font-size:11px;color:#8db5a0}
</style></head><body><main class="card"><h1>راه‌اندازی سامانه امین عبدی</h1>
<?php if($success): ?><div class="success">ساختار دیتابیس و اطلاعات اولیه منتقل شد. حساب مدیر و حساب کاربر دوم آماده‌اند. اکنون فایل install.php را از هاست حذف کنید و سپس وارد <a style="color:#a7f3d0" href="login.html">صفحه ورود</a> شوید.</div>
<?php else: ?><p>اطلاعات اتصال دیتابیس هاست و دو رمز جدید را وارد کنید. این اطلاعات در همین صفحه امن دریافت و فایل تنظیمات خارج از پوشه عمومی سایت ذخیره می‌شود. رمزها در GitHub یا چت ثبت نمی‌شوند.</p>
<?php if($error): ?><div class="error"><?= $error ?></div><?php endif; ?>
<form method="post" autocomplete="off"><input type="hidden" name="install_csrf" value="<?= $_SESSION['install_csrf'] ?>">
<label>رمز دیتابیس MySQL (engcor_amin)</label><input type="password" name="db_password" required autocomplete="new-password">
<label>رمز جدید مدیر سامانه (aminabdi232@gmail.com)</label><input type="password" name="admin_password" required minlength="8" autocomplete="new-password">
<label>رمز جدید کاربر دوم (+989399929110)</label><input type="password" name="second_password" required minlength="10" autocomplete="new-password">
<p class="note">برای هر حساب رمز متفاوت و قوی انتخاب کنید. رمزها پس از هش شدن ذخیره می‌شوند.</p>
<button type="submit">ایجاد دیتابیس و انتقال اطلاعات</button></form><?php endif; ?></main></body></html>