// Target: Uno R3. 10k potentiometer ends: 5V/GND, wiper: A0.
unsigned long sampledAt = 0;
bool alarmOn = false;
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}
void loop() {
  const unsigned long now = millis();
  if (now - sampledAt < 100) return;
  sampledAt = now;
  const int value = analogRead(A0);
  if (value >= 650) alarmOn = true;
  else if (value <= 550) alarmOn = false;
  digitalWrite(LED_BUILTIN, alarmOn);
  Serial.print(value);
  Serial.print(',');
  Serial.println(alarmOn ? 1 : 0);
}
