/*
 *  ------------------------------------------------------------
 *   爱心点阵 · 你的第一个 Arduino 项目
 *  ------------------------------------------------------------
 *   硬件：Arduino UNO + 8×32 MAX7219 点阵（4 片 8×8 串起来）
 *   接线：VCC -> 5V    GND -> GND    DIN -> D11
 *         CS  -> D10   CLK -> D13
 *
 *   用法：插上 USB -> 选好 Arduino Uno 和端口 -> 点“上传”。
 *        不需要安装任何库，代码会自己驱动点阵。
 *
 *   上电后先全亮 1 秒（自检：四片都亮 = 接线成功），
 *   然后爱心会一直亮着，只让亮度跟着心跳起伏。
 *  ------------------------------------------------------------
 */

#include <SPI.h>

// ===== 只有这两行可能需要你改（画面方向不对的时候）=====
#define FLIP_X 0          // 左右镜像：画面左右反了改成 1
#define FLIP_Y 0          // 上下颠倒：爱心变成“黑桃”改成 1

// ===== 两个好玩的旋钮 =====
#define BEAT_MS      1100 // 一次心跳多少毫秒：改小跳得快，改大更平静
#define BRIGHT_SCALE 100  // 整体亮度百分比：觉得刺眼就改成 60

const uint8_t PIN_CS = 10;        // CS / LOAD 接 D10
const uint8_t CHIPS  = 4;         // 4 片 8×8
const uint8_t WIDTH  = CHIPS * 8; // 一共 32 列

uint8_t canvas[WIDTH];            // 画布：一列一个字节，bit0 = 最上面那颗灯

// ------------------------------------------------------------------
//  爱心图案：'#' 是亮，'.' 是灭，一共 8 行、每行 32 个字符。
//  想换个图案？直接改这块字符画就行，一个字符对一颗灯。
// ------------------------------------------------------------------
const char *HEART[8] = {
  "............###..###............",
  "...........####..####...........",
  "..........############..........",
  "..........############..........",
  "...........##########...........",
  "............########............",
  ".............######.............",
  "...............##...............",
};

// ------------------------------------------------------------------
//  下面是可以先跳过的部分：怎么跟 MAX7219 说话
// ------------------------------------------------------------------

// 给第 chip 片（0 是最靠近 DIN 的那片）的某个寄存器写一个字节。
// 点阵是串联的，所以每次要把 4 片都“喂”一遍，其余的喂 0x00（空操作）。
void maxWrite(uint8_t chip, uint8_t reg, uint8_t value) {
  digitalWrite(PIN_CS, LOW);
  for (int8_t i = CHIPS - 1; i >= 0; i--) {
    if (i == chip) {
      SPI.transfer(reg);
      SPI.transfer(value);
    } else {
      SPI.transfer(0x00);
      SPI.transfer(0x00);
    }
  }
  digitalWrite(PIN_CS, HIGH);
}

void maxSetup() {
  for (uint8_t c = 0; c < CHIPS; c++) {
    maxWrite(c, 0x0F, 0x00);      // 关掉测试模式
    maxWrite(c, 0x0B, 0x07);      // 8 行全用
    maxWrite(c, 0x09, 0x00);      // 不译码（点阵必须这样）
    maxWrite(c, 0x0A, 0x03);      // 初始亮度
    maxWrite(c, 0x0C, 0x01);      // 开显示
  }
}

// 把画布送到点阵上。
//
// 【重要】这块 8×32 点阵是“转置”接法的：每一片的 8 个寄存器
// （0x01~0x08）对应的是 8 行，不是 8 列；每个字节的 8 个 bit 对应 8 列。
// 所以发数据前要把图像转置一下，否则爱心会被切成左右两块。
void show(uint8_t level) {
  level = (uint16_t)level * BRIGHT_SCALE / 100;   // 应用亮度旋钮
  if (level > 15) level = 15;

  for (uint8_t c = 0; c < CHIPS; c++) {
    maxWrite(c, 0x0A, level);                     // 这一片的亮度

    for (uint8_t r = 0; r < 8; r++) {             // 第 r 行
      uint8_t bits = 0;
      for (uint8_t b = 0; b < 8; b++) {           // 第 b 列
        uint8_t rr = FLIP_Y ? (7 - r) : r;        // 上下颠倒
        uint8_t bb = FLIP_X ? (7 - b) : b;        // 左右镜像
        if (canvas[c * 8 + bb] & (1 << rr)) bits |= (1 << b);
      }
      maxWrite(c, r + 1, bits);                   // 0x01~0x08 就是第 1~8 行
    }
  }
}

// 把一张 8 行的字符画刷进画布
void drawHeart(const char *art[8]) {
  memset(canvas, 0, WIDTH);
  for (uint8_t y = 0; y < 8; y++) {
    for (uint8_t x = 0; x < WIDTH; x++) {
      if (art[y][x] == '#') canvas[x] |= (1 << y);
    }
  }
}

// 上电自检：全部点亮 1 秒。四片都亮，就说明接线和供电都没问题。
void selfTest() {
  memset(canvas, 0xFF, WIDTH);
  show(6);
  delay(1000);
  memset(canvas, 0x00, WIDTH);
  show(0);
  delay(150);
}

// ------------------------------------------------------------------
//  setup / loop
// ------------------------------------------------------------------
void setup() {
  pinMode(PIN_CS, OUTPUT);
  digitalWrite(PIN_CS, HIGH);

  SPI.begin();
  SPI.setBitOrder(MSBFIRST);
  SPI.setDataMode(SPI_MODE0);
  SPI.setClockDivider(SPI_CLOCK_DIV4);   // 4 MHz，MAX7219 吃得下

  maxSetup();
  selfTest();

  drawHeart(HEART);   // 爱心画一次，之后循环里只改亮度
}

void loop() {
  uint16_t t = millis() % BEAT_MS;   // 0 ~ BEAT_MS 之间循环
  uint8_t  level;

  if (t < 220) {                     // 咚：最亮，然后快速回落
    level = 15 - (uint8_t)((uint32_t)t * 8 / 220);          // 15 -> 7
  } else if (t < 340) {              // 稍停一下
    level = 7;
  } else if (t < 560) {              // 哒：第二下，弱一点，慢一点回落
    level = 12 - (uint8_t)((uint32_t)(t - 340) * 6 / 220);  // 12 -> 6
  } else {                           // 安静：也保持能看清
    level = 5;
  }

  show(level);
  delay(15);
}
