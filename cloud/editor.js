const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function rewrite({text,tone='thân thiện, chuyên nghiệp'}){
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('Thiếu GEMINI_API_KEY trong backend/.env');
 const prompt=`Bạn là biên tập viên trang Facebook "${process.env.PAGE_NAME||''}". Dựa vào tin dưới đây, trả về JSON với các khóa: title (tiêu đề hấp dẫn, dưới 90 ký tự), content (120-200 từ, mở đầu thu hút, kết bằng câu hỏi mời bình luận), hashtags (chuỗi 3 hashtag), image_note (gợi ý ảnh minh họa kèm chú thích ảnh ngắn). Giọng: ${tone}. Chỉ dùng thông tin có trong tin gốc, không bịa số liệu, không hứa hẹn lợi nhuận.\n\nTin gốc:\n${text}`;
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL||'gemini-3.8-flash'}:generateContent?key=${key}`;
 const body=JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json'}});
 let j,r;
 for(let k=0;k<4;k++){ // quá tải/giới hạn tạm thời: thử lại sau 3s, 8s, 15s
  r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body});j=await r.json();
  if(r.ok||![429,500,503].includes(r.status)||k==3)break;
  await wait([3000,8000,15000][k])}
 if(!r.ok)throw new Error(r.status==503||r.status==429?'Google đang quá tải hoặc hết hạn mức tạm thời. Đợi vài phút rồi bấm lại.':(j.error?.message||'Lỗi AI'));
 try{const o=JSON.parse(j.candidates[0].content.parts[0].text);return{title:o.title||'',content:o.content||'',hashtags:o.hashtags||'',image_note:o.image_note||''}}
 catch{throw new Error('AI trả về sai định dạng, thử lại')}}
