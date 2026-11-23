---
title: "第一次让 LED 心跳：从 delay 到 millis"
date: 2026-11-23
tags: [Arduino, GPIO, 实验日志]
summary: "用非阻塞计时让板载 LED 每 500 ms 翻转一次，并记录间隔改变后观察到的现象。"
cover: "./assets/engineering-studio-bg.jpg"
---

> 这是一篇示例日志，用来展示实验记录的写法。真正开始学习后，把它替换成你自己的记录。

## 今天的目标

先不接任何外部元件，用 Uno R3 的板载 LED 完成第一次“输出”实验：

- 让 LED 每 500 ms 翻转一次；
- 串口每翻转一次打印一行日志；
- 把间隔改成 200 ms，对比前后现象。

## 为什么不用 `delay()`

`delay(500)` 会让程序停在那里，期间不能读按键、不能处理串口。先用 `millis()` 做非阻塞计时，是为了从第一天就建立“主循环不能被阻塞”的习惯。

```cpp
const unsigned long intervalMs = 500;
unsigned long previousMs = 0;
bool ledOn = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  const unsigned long now = millis();
  if (now - previousMs >= intervalMs) {
    previousMs = now;
    ledOn = !ledOn;
    digitalWrite(LED_BUILTIN, ledOn);
    Serial.println(ledOn ? "ON" : "OFF");
  }
}
```

## 观察记录

| 间隔 | 串口现象 | 我的解释 |
| --- | --- | --- |
| 500 ms | 每 500 ms 打印一次 ON/OFF | 一个完整亮灭周期约 1 秒 |
| 200 ms | 打印明显变快 | 周期缩短到约 0.4 秒 |
| 50 ms | 肉眼几乎看不出闪烁 | 已经接近视觉暂留的边界 |

改成 50 ms 后，灯看起来像一直亮着，但串口仍然在稳定翻转。这说明“看起来亮”和“输出在翻转”是两件事，不能只凭肉眼判断程序有没有跑。

## 遇到的问题

1. 第一次上传后串口没有输出：选错了端口，不是代码问题。
2. 把 `previousMs = now` 写到 `if` 外面，灯几乎不闪：计时基准被不断刷新。
3. 用 `int` 存 `millis()`：目前没问题，但长时间运行有溢出风险，改成 `unsigned long`。

## 下一步

- [ ] 把翻转逻辑封装成 `blinkOnce()`，为后面的状态机做准备；
- [ ] 读一遍 `millis()` 的返回值类型和溢出行为；
- [ ] 用英语写一句项目介绍，放进英语页练习。

## 一句话总结

> 这不是“让灯亮”，而是第一次让程序按时间做事，并且用日志证明它真的做了。
