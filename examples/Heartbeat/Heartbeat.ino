// Target: Arduino Uno R3 (ATmega328P). Uses onboard LED; no external wiring.
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
