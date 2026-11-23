---
title: "按键消抖：为什么按一次会翻转好几次"
date: 2026-11-23
tags: [Arduino, 输入, 调试, 实验日志]
summary: "用 INPUT_PULLUP 和 30 ms 时间窗做软件消抖，验证短按、长按与快速连按的行为。"
cover: "./assets/industrial-studio-bg.jpg"
---

> 示例日志：记录一次输入实验。可以按同样结构写你自己的按键、传感器或通信实验。

## 目标

按键接在 D2 和 GND 之间，使用内部上拉。每次有效按下只翻转一次 LED，长按不能连续触发，并加入 30 ms 软件消抖。

## 接线

- 按键一端 → `D2`
- 按键另一端 → `GND`
- 使用 `INPUT_PULLUP`，松开时读到 `HIGH`，按下时读到 `LOW`
- 四脚按键要先确认哪些脚内部常通，跨接两个独立触点；接线前断开 USB

## 关键代码

```cpp
const byte buttonPin = 2;
bool lastRaw = HIGH;
bool stable = HIGH;
bool ledOn = false;
unsigned long changedAt = 0;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  const unsigned long now = millis();
  const bool raw = digitalRead(buttonPin);

  if (raw != lastRaw) {
    changedAt = now;
    lastRaw = raw;
  }

  if (now - changedAt >= 30 && raw != stable) {
    stable = raw;
    if (stable == LOW) {
      ledOn = !ledOn;
      digitalWrite(LED_BUILTIN, ledOn);
      Serial.println(ledOn ? "ON" : "OFF");
    }
  }
}
```

## 我怎样验证

1. 短按 20 次，记录 LED 实际翻转次数；
2. 长按 3 秒，确认只翻转一次；
3. 快速连按 10 次，观察有没有丢动作；
4. 把 30 ms 改成 5 ms，再重复一次，观察差异。

结果是：30 ms 时 20 次全部通过；5 ms 时偶尔出现一次按下翻转两次，说明消抖窗口不能太小。

## 排错笔记

- 读数一直是 `LOW`：按键接到了同一组常通脚，或者 D2 被短路到 GND；
- 读数一直是 `HIGH`：没有共地，或者按键没有跨接到两个独立触点；
- 偶尔重复触发：先打印原始 `raw`，确认是机械抖动还是程序在重复执行翻转。

## 下一步

- [ ] 把消抖逻辑改成独立函数，方便复用到其他按键；
- [ ] 尝试用状态机处理“短按 / 长按 / 双击”；
- [ ] 整理接线图和串口截图，补到这篇日志里。

## 一句话总结

> 消抖不是“让按键更灵敏”，而是让程序对机械抖动更迟钝一点。
