import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SWAGGER_INIT_URL = 'https://mcms-h5g5dtdzajf0bebm.eastasia-01.azurewebsites.net/api-docs/swagger-ui-init.js';
const TEMP_SPEC = './temp-swagger.json';
const OUTPUT_TYPES = './src/types/api-schema.d.ts';

async function updateApi() {
  console.log('⏳ Đang tự động kết nối Azure và tải Swagger spec...');
  try {
    const res = await fetch(SWAGGER_INIT_URL);
    if (!res.ok) {
      throw new Error(`Tải thất bại với HTTP status: ${res.status}`);
    }
    const text = await res.text();

    const marker = '"swaggerDoc":';
    const startIndex = text.indexOf(marker);
    if (startIndex === -1) {
      throw new Error('Không tìm thấy object "swaggerDoc" trong file trả về.');
    }

    const jsonStart = text.indexOf('{', startIndex);
    let openBrackets = 0;
    let jsonEnd = -1;

    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') openBrackets++;
      else if (text[i] === '}') {
        openBrackets--;
        if (openBrackets === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) {
      throw new Error('Cấu trúc JSON trong swaggerDoc không hoàn chỉnh.');
    }

    const swaggerJsonStr = text.substring(jsonStart, jsonEnd);
    JSON.parse(swaggerJsonStr);

    fs.writeFileSync(TEMP_SPEC, swaggerJsonStr, 'utf-8');

    const targetDir = path.dirname(OUTPUT_TYPES);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log('⚙️ Đang đồng bộ và sinh TypeScript types...');
    execSync(`npx openapi-typescript ${TEMP_SPEC} -o ${OUTPUT_TYPES}`, { stdio: 'inherit' });

    if (fs.existsSync(TEMP_SPEC)) fs.unlinkSync(TEMP_SPEC);

    console.log(`\n🎉 Thành công! Types API đã nằm tại: ${OUTPUT_TYPES}`);
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    if (fs.existsSync(TEMP_SPEC)) fs.unlinkSync(TEMP_SPEC);
  }
}

updateApi();