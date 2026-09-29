# 도안 제작·검수 기록

요청 목록은 `catalog.json`에 원래 순서대로 보관합니다. 각 주제 20종이며, 기존 기본 SVG 6종은 별도로 유지합니다.

2026-09-28 완료: PNG 80종을 개별 시각 검수하고 앱에 승인 반영했습니다. 전체 80종 자동 검사 통과, 브라우저의 채우기·실행 취소·다시 실행·지우기·저장·주제 전환·모바일 브러시 검사 통과, 채우기 단위 테스트 및 프로덕션 빌드 성공. 모바일 검증은 Edge의 390×844 터치 화면 에뮬레이션이며 실제 Android 기기 검증은 아닙니다.

## 제작

- 내장 `image_gen`으로 도안마다 개별 생성. CLI/API 대체 경로는 사용하지 않음.
- 실제 앱 파일: `public/artwork/<id>.png`.
- 생성 원본은 Codex의 `generated_images`에도 보존됨.
- `catalog.json`의 `subject`를 아래 프롬프트의 `SUBJECT` 자리에 대입했습니다. 색 이름은 미리 칠하지 않고 아이가 선택하도록 흑백으로 제작했습니다.

```text
Use case: illustration-story. Create ONE finished coloring page for a children's tap flood-fill app. Subject: SUBJECT. Pure black thick smooth continuous CLOSED outlines on pure white background, no colors or gray, no shadows, no textures, no text, no border. Simple cute rounded preschool illustration, fully visible centered subject filling 75% of page with generous clear margins. Approximately 12-22 large easy-to-tap enclosed areas. Simplify all details, no tiny patterns. Every colorable shape must be sealed, adjacent strokes meet without gaps. Landscape 7:6 composition for a 700x600 canvas. Do not draw a grid or multiple versions.
```

동물 06번부터 추가한 문장:

```text
Avoid any open decorative lines outside the subject; all water splashes and magic trails must be fully closed shapes. Omit extra scenery.
```

첫 곰 도안에 사용한 프롬프트:

```text
Create one finished children's coloring book page for a tap flood-fill app. Subject: a cute baby bear hugging a large honey jar. Black and white line art only, white background, no text, no shading, no hatching. One centered full body character, generous blank margin. Very simple rounded shapes, thick smooth black continuous CLOSED outlines with no gaps, 12-20 large enclosed regions, large face belly paws and jar, dot eyes. Landscape 7:6 composition suitable for 700x600 canvas. Make adjacent outlines join completely. No decorative tiny details.
```

## 검수 방법

수정 이력: 동물 05의 열린 물결 장식 제거, 07의 공을 털실로 명확하게 표현, 10의 잘린 연못 외곽 복원, 14의 나뭇가지 양 끝을 닫힌 형태로 수정했습니다. 모두 내장 이미지 도구로 수정했습니다.

공주 19는 일반 왕관을 해바라기 꽃 왕관으로 수정했습니다. 수정 프롬프트:

```text
Edit this children's coloring page. Replace ONLY the pointed royal crown with a clearly recognizable sunflower crown: a simple headband topped with three large sunflower blossoms, each with one broad circular center and six broad enclosed petals. Keep the princess, large held sunflower, pose, thick black closed outlines and white background. No colors, shading, text, tiny details. All crown petals must be enclosed and easy to tap fill. Keep generous margins and everything fully visible.
```

생성 결과를 직접 열어 주제 일치, 큰 색칠 면, 주요 윤곽, 잘림을 확인합니다. `check.cjs`는 실제 앱과 같은 700×600 크기로 이미지를 표시하고 흰 연결 영역을 분석합니다. 큰 닫힌 영역(900픽셀 이상)이 3개 이상인지, 가장자리 잘림이 있는지 검사하며, 최대 세 개의 큰 영역에 앱의 실제 `floodFill` 함수를 실행해 배경 누출과 검은 선 손상을 확인합니다.

`qa-results.json`은 자동 검사의 측정 결과입니다. 이 검사는 모든 의미상 구획의 완전한 분리나 모든 작은 영역의 터치 용이성을 증명하지 않습니다. 눈·표정 등 일부 작은 구획은 남아 있습니다.

Vite 서버 실행 후 Playwright를 사용할 수 있는 환경에서:

```sh
node artwork/check.cjs
node browser-check.cjs
node --test src/fill.test.js
node node_modules/vite/bin/vite.js build --configLoader runner
```

`catalog.json`에서 `status: approved`인 도안만 앱에 노출됩니다. 새 도안을 교체할 때는 시각 검수와 자동 검사를 다시 실행합니다.
