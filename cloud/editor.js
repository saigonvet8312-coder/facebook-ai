const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function rewrite({text,tone='thân thiện, chuyên nghiệp'}){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('Thiếu GEMINI_API_KEY trong backend/.env');
 const prompt=`Bạn là biên tập viên trang Facebook "${process.env.PAGE_NAME||''}". Dựa vào tin dưới đây, trả về JSON với các khóa: title (tiêu đề hấp dẫn, dưới 90 ký tự), content (120-200 từ, mở đầu thu hút, kết bằng câu hỏi mời bình luận), hashtags (chuỗi 3 hashtag), image_note (gợi ý ảnh minh họa kèm chú thích ảnh ngắn). Giọng: ${tone}. Chỉ dùng thông tin có trong tin gốc, không bịa số liệu, không hứa hẹn lợi nhuận.\n\nTin gốc:\n${text}`;
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL||'gemini-3.8-flash'}:generateContent?key=${key}`;
 const body=JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}});
 let j,r;
 for(let k=0;k<4;k++){ // quá tải/giới hạn tạm thời: thử lại sau 3s, 8s, 15s
  try{r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(60000)});j=await r.json()}
  catch(e){if(k==3)throw new Error('Không kết nối được Google AI: '+(e.cause?.code||e.cause?.message||e.name));await wait(5000*(k+1));continue}
  if(r.ok||![429,500,503].includes(r.status)||k==3)break;
  await wait([10000,30000,60000][k])}
 if(!r.ok){let hint='';
  if([404,429,503].includes(r.status)){try{const l=await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`,{signal:AbortSignal.timeout(20000)})).json();
   hint=' | Model khóa này có thể dùng: '+(l.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')&&/flash/i.test(m.name)).map(m=>m.name.replace('models/','')).join(', ')}catch{}}
  throw new Error(`Google ${r.status}: ${j?.error?.message||'Lỗi AI'}${hint}`)}
 try{const o=JSON.parse(j.candidates[0].content.parts[0].text);return{title:o.title||'',content:o.content||'',hashtags:o.hashtags||'',image_note:o.image_note||''}}
 catch{throw new Error('AI trả về sai định dạng, thử lại')}}
