// Target: Uno R3. Normally-open button between D2 and GND.
const byte buttonPin = 2;
bool lastRaw = HIGH, stable = HIGH, ledOn = false;
unsigned long changedAt = 0;
void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  const unsigned long now = millis();
  const bool raw = digitalRead(buttonPin);
  if (raw != lastRaw) { changedAt = now; lastRaw = raw; }
  if (now - changedAt >= 30 && raw != stable) {
    stable = raw;
    if (stable == LOW) {
      ledOn = !ledOn;
      digitalWrite(LED_BUILTIN, ledOn);
      Serial.println(ledOn ? "ON" : "OFF");
    }
  }
}
