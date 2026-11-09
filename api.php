<?php
declare(strict_types=1);
$configPath = dirname(__DIR__) . '/engcore-config.php';
if (!is_file($configPath)) { http_response_code(503); header('Content-Type: application/json; charset=utf-8'); echo json_encode(['error'=>'سامانه هنوز راه‌اندازی نشده است.']); exit; }
$config = require $configPath;
session_name('engcore_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Lax']);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
 $allowed = ['https://engcore.ir','https://www.engcore.ir'];
 if (!in_array($origin,$allowed,true)) { http_response_code(403); echo json_encode(['error'=>'مبدأ درخواست مجاز نیست.']); exit; }
 header('Access-Control-Allow-Origin: '.$origin);
 header('Access-Control-Allow-Credentials: true');
 header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
 header('Access-Control-Allow-Methods: POST, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD']==='OPTIONS') { http_response_code(204); exit; }
function out(array $data,int $status=200): never { http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function db(): PDO {
 global $config; static $pdo=null;
 if (!$pdo) $pdo=new PDO('mysql:host='.$config['db_host'].';dbname='.$config['db_name'].';charset=utf8mb4',$config['db_user'],$config['db_pass'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
 return $pdo;
}
function body(): array { $v=json_decode(file_get_contents('php://input') ?: '{}',true); return is_array($v)?$v:[]; }
function uuidv4(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&0x0f)|0x40); $b[8]=chr((ord($b[8])&0x3f)|0x80); return sprintf('%s-%s-%s-%s-%s',bin2hex(substr($b,0,4)),bin2hex(substr($b,4,2)),bin2hex(substr($b,6,2)),bin2hex(substr($b,8,2)),bin2hex(substr($b,10,6))); }
function csrf_check(): void { $sent=$_SERVER['HTTP_X_CSRF_TOKEN']??''; if(!isset($_SESSION['csrf'])||!is_string($sent)||!hash_equals($_SESSION['csrf'],$sent))out(['error'=>'اعتبار درخواست منقضی شده است. صفحه را تازه‌سازی کنید.'],419); }
function current_user(): array {
 if(empty($_SESSION['uid']))out(['error'=>'برای ادامه وارد سامانه شوید.'],401);
 $s=db()->prepare('SELECT id,username,email,phone,full_name,job_title,is_admin,is_active FROM app_profiles WHERE id=? LIMIT 1');$s->execute([$_SESSION['uid']]);$u=$s->fetch();
 if(!$u||!(int)$u['is_active']){$_SESSION=[];session_destroy();out(['error'=>'حساب کاربری غیرفعال یا نامعتبر است.'],401);}return $u;
}
$input=body();$action=(string)($input['action']??'');
try {
 if($action==='session'){
  if(empty($_SESSION['csrf']))$_SESSION['csrf']=bin2hex(random_bytes(32));
  if(empty($_SESSION['uid']))out(['session'=>null,'csrf'=>$_SESSION['csrf']]);
  $u=current_user();out(['session'=>['user'=>['id'=>$u['id'],'email'=>$u['email'],'phone'=>$u['phone']]],'csrf'=>$_SESSION['csrf']]);
 }
 if($action==='login'){
  $identifier=trim((string)($input['identifier']??''));$password=(string)($input['password']??'');
  if($identifier===''||$password==='')out(['error'=>'نام کاربری و رمز عبور را وارد کنید.'],422);
  $q=db()->prepare('SELECT id,password_hash,is_active FROM app_profiles WHERE username=? OR email=? OR phone=? LIMIT 1');$q->execute([$identifier,$identifier,$identifier]);$u=$q->fetch();
  if(!$u||!(int)$u['is_active']||empty($u['password_hash'])||!password_verify($password,$u['password_hash']))out(['error'=>'نام کاربری یا رمز عبور صحیح نیست.'],401);
  session_regenerate_id(true);$_SESSION['uid']=$u['id'];$_SESSION['csrf']=bin2hex(random_bytes(32));$p=current_user();
  out(['user'=>['id'=>$p['id'],'email'=>$p['email'],'phone'=>$p['phone']],'csrf'=>$_SESSION['csrf']]);
 }
 if($action==='logout'){csrf_check();$_SESSION=[];if(ini_get('session.use_cookies')){$p=session_get_cookie_params();setcookie(session_name(),'',time()-42000,$p['path'],$p['domain']??'',true,true);}session_destroy();out(['success'=>true]);}
 if($action==='create_user'){
  csrf_check();$admin=current_user();if(!(int)$admin['is_admin'])out(['error'=>'این عملیات فقط برای مدیر سامانه مجاز است.'],403);
  $name=trim((string)($input['full_name']??''));$phone=trim((string)($input['phone']??''));$job=trim((string)($input['job_title']??''));$pass=(string)($input['password']??'');
  if($name===''||$phone===''||strlen($pass)<10)out(['error'=>'نام، شماره همراه و رمز حداقل ۱۰ نویسه‌ای الزامی است.'],422);
  $normalized=preg_replace('/[\s()-]/','',$phone);
  if(preg_match('/^09\d{9}$/',$normalized))$normalized='+98'.substr($normalized,1);elseif(preg_match('/^9\d{9}$/',$normalized))$normalized='+98'.$normalized;
  $id=uuidv4();$s=db()->prepare('INSERT INTO app_profiles (id,username,phone,password_hash,full_name,job_title,is_admin,is_active) VALUES (?,?,?,?,?,?,0,1)');
  $s->execute([$id,$normalized,$normalized,password_hash($pass,PASSWORD_DEFAULT),$name,$job?:null]);out(['success'=>true,'user'=>['id'=>$id,'phone'=>$normalized]]);
 }
 if($action!=='query')out(['error'=>'عملیات ناشناخته است.'],400);
 csrf_check();$user=current_user();$table=(string)($input['table']??'');$method=(string)($input['method']??'select');
 $columns=[
 'app_profiles'=>['id','username','email','phone','full_name','job_title','is_admin','is_active','created_at','updated_at'],
 'app_settings'=>['setting_key','setting_value','updated_by','updated_at'],
 'module_catalog'=>['id','module','parent_id','node_type','name','sort_order','created_by','created_at'],
 'module_records'=>['id','module','title','project_name','reference_no','amount','status','responsible','details','created_by','created_at','updated_at'],
 'company_projects'=>['id','code','name','client_name','contract_amount','status','start_date','end_date','notes','created_at','updated_at'],
 'company_employees'=>['id','employee_no','full_name','phone','job_title','project_id','employment_status','hire_date','created_at','updated_at'],
 'payroll_entries'=>['id','employee_id','project_id','period_year','period_month','base_amount','overtime_amount','bonuses','deductions','status','notes','created_at','updated_at'],
 'financial_entries'=>['id','project_id','entry_type','title','amount','entry_date','reference_no','status','notes','created_by','created_at','updated_at']
 ];
 if(!isset($columns[$table]))out(['error'=>'جدول درخواستی مجاز نیست.'],400);
 $isAdmin=(int)$user['is_admin']===1;
 if(in_array($table,['company_projects','company_employees','payroll_entries','financial_entries','module_records'],true)&&!$isAdmin)out(['error'=>'دسترسی کافی نیست.'],403);
 if($method==='select'){
  $selected=$input['columns']??'*';$selected=$selected==='*'?$columns[$table]:(is_array($selected)?$selected:explode(',',(string)$selected));
  foreach($selected as $col)if(!in_array($col,$columns[$table],true))out(['error'=>'ستون نامعتبر است.'],400);
  $sql='SELECT '.implode(',',array_map(fn($x)=>$x,$selected)).' FROM '.$table.' WHERE 1=1';$params=[];
  if($table==='app_profiles'&&!$isAdmin){$sql.=' AND id=?';$params[]=$user['id'];}
  foreach(($input['filters']??[]) as $f){$col=(string)($f['column']??'');$op=(string)($f['op']??'eq');$val=$f['value']??null;if(!in_array($col,$columns[$table],true))out(['error'=>'فیلتر نامعتبر است.'],400);
   if($op==='is'&&$val===null)$sql.=' AND '.$col.' IS NULL';
   elseif($op==='in'&&is_array($val)&&count($val)>0){$sql.=' AND '.$col.' IN ('.implode(',',array_fill(0,count($val),'?')).')';foreach($val as $v)$params[]=$v;}
   elseif($op==='eq'){$sql.=' AND '.$col.'=?';$params[]=$val;}else out(['error'=>'نوع فیلتر نامعتبر است.'],400);
  }
  foreach(($input['orders']??[]) as $o){$col=(string)($o['column']??'');if(!in_array($col,$columns[$table],true))out(['error'=>'مرتب‌سازی نامعتبر است.'],400);$sql.=' ORDER BY '.$col.' '.(!empty($o['ascending'])?'ASC':'DESC');}
  if(empty($input['orders']))$sql.=' ORDER BY created_at DESC';$limit=max(1,min(500,(int)($input['limit']??100)));$sql.=' LIMIT '.$limit;
  $q=db()->prepare($sql);$q->execute($params);$rows=$q->fetchAll();foreach($rows as &$row)foreach(['setting_value','details'] as $j)if(isset($row[$j])&&is_string($row[$j]))$row[$j]=json_decode($row[$j],true);out(['data'=>$rows]);
 }
 if(!$isAdmin)out(['error'=>'فقط مدیر سامانه مجاز به تغییر اطلاعات است.'],403);
 if($method==='insert'){
  if(!in_array($table,['module_catalog','module_records'],true))out(['error'=>'ثبت در این جدول از این مسیر مجاز نیست.'],403);
  $rows=$input['values']??[];if(!is_array($rows))out(['error'=>'داده نامعتبر است.'],422);if(!array_is_list($rows))$rows=[$rows];$created=[];
  foreach($rows as $row){if(!is_array($row))continue;$allowed=$table==='module_catalog'?['id','module','parent_id','node_type','name','sort_order','created_by']:['id','module','title','project_name','reference_no','amount','status','responsible','details','created_by'];$data=array_intersect_key($row,array_flip($allowed));if(!isset($data['id']))$data['id']=uuidv4();if($table==='module_records'){$data['details']=json_encode($data['details']??[],JSON_UNESCAPED_UNICODE);$data['created_by']=$user['id'];}
   $fields=array_keys($data);$sql='INSERT INTO '.$table.' ('.implode(',',$fields).') VALUES ('.implode(',',array_fill(0,count($fields),'?')).')';$q=db()->prepare($sql);$q->execute(array_values($data));$created[]=$data;
  }out(['data'=>$created]);
 }
 if($method==='delete'){
  if($table!=='module_catalog')out(['error'=>'حذف از این جدول مجاز نیست.'],403);$ids=$input['in']??[];if(!is_array($ids)||!count($ids))out(['error'=>'شناسه حذف مشخص نشده است.'],422);$q=db()->prepare('DELETE FROM module_catalog WHERE id IN ('.implode(',',array_fill(0,count($ids),'?')).')');$q->execute($ids);out(['data'=>['deleted'=>$q->rowCount()]]);
 }
 if($method==='upsert'){
  if($table!=='app_settings')out(['error'=>'عملیات upsert برای این جدول مجاز نیست.'],403);$d=$input['values']??[];$key=(string)($d['setting_key']??'');if($key==='')out(['error'=>'کلید تنظیمات الزامی است.'],422);$val=json_encode($d['setting_value']??new stdClass(),JSON_UNESCAPED_UNICODE);
  $q=db()->prepare('INSERT INTO app_settings (setting_key,setting_value,updated_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP');$q->execute([$key,$val,$user['id']]);out(['data'=>[['setting_key'=>$key,'setting_value'=>json_decode($val,true)]]]);
 }
 out(['error'=>'عملیات نامعتبر است.'],400);
} catch(Throwable $e){error_log('Engcore API error: '.$e->getMessage());out(['error'=>'خطای داخلی سرور رخ داد.'],500);}
