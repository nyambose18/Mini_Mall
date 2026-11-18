---
title: LD06 / LD19 LiDAR - English Setup and Usage Guide
subtitle: Wiring, communication protocol and quick start for the LDROBOT LD06 / LD19
source: Based on the LDROBOT "LD19 Laser LiDAR Sensor - Development Manual v2.5" (the uploaded PDF)
date: 16 November 2026
---

# 1. About this guide

This is an English working guide for the LDROBOT LD06 LiDAR, written from the uploaded
Chinese manual **LD19 Development Manual v2.5**. The manual itself is titled LD19, but its
section 5.6 states that it applies to **both the LD06 and LD19** models - they share the same
connector, communication protocol and software. Page references such as "(manual p. 4)" point
to that PDF.

The LD06 is a **LiDAR** (a laser scanner), although it is often loosely called a "radar". It
spins a laser around 360 degrees and reports the distance to the nearest object in every
direction.

# 2. What the sensor does

The measuring core uses **DTOF** (direct time of flight): it fires an infrared laser pulse,
receives the reflection on a single-photon sensor, and computes distance from the light's
flight time. It performs **4500 measurements per second** (manual p. 3). The rotating head
receives power and sends data through contactless (wireless) power-transfer and communication
units, which lets the head spin freely.

Key facts:

| Property | Value | Source |
|---|---|---|
| Measuring principle | DTOF (infrared laser, time of flight) | manual p. 3 |
| Measurement rate | 4500 measurements per second | manual p. 3 |
| Field of view | 360 degrees | manual p. 3, p. 10 |
| Rotation speed (internal control) | 10 ± 0.1 Hz, stable within 3 s after power-up | manual p. 3, p. 4 |
| Rotation speed (external control) | Set by PWM duty cycle | manual p. 4 |
| Data interface | UART, one-way, 230400 baud, 8N1, no flow control | manual p. 4 |
| Supply voltage (P5V) | 4.5 V min, 5 V typical, 5.5 V max | manual p. 4 |
| Connector | ZH1.5T-4P, 1.5 mm pitch | manual p. 4 |
| Maximum range | Not stated in the v2.5 manual; the LD06/LD19 family datasheet quotes about 12 m | product datasheet |
| Current draw | Not stated; allow at least 0.5 A for the motor | practical |

# 3. Connector and wiring

The 4-pin connector (ZH1.5T-4P, 1.5 mm) carries power and data (manual p. 4):

| Pin | Signal | Type | Description | Min | Typical | Max |
|---|---|---|---|---|---|---|
| 1 | Tx | Output | LiDAR data output | 0 V | 3.3 V | 3.5 V |
| 2 | PWM | Input | Motor control signal | 0 V | - | 3.3 V |
| 3 | GND | Supply | Power negative | - | 0 V | - |
| 4 | P5V | Supply | Power positive | 4.5 V | 5 V | 5.5 V |

The pin numbers are the ones printed in the manual's connector drawing. Wire colours are
not specified by the manual and vary between cable batches - identify wires by the pin
number on the connector or on the adapter board, not by colour.

## 3.1 Wiring rules

1. **Power:** 5 V on pin 4, ground on pin 3. Do not power the motor from 3.3 V.
2. **Data:** pin 1 (Tx, lidar output) goes to the **RX** pin of your board or USB adapter.
3. **PWM:** pin 2 is an input. **If you are not using external speed control, connect pin 2
   to GND.** The manual requires this (p. 4); with the pin floating the internal speed
   control is not guaranteed to engage.
4. **Common ground:** the lidar ground and host ground must be connected.
5. **Logic level:** Tx swings between 0 V and about 3.3 V. 3.3 V boards (Raspberry Pi,
   ESP32, Pi Pico) can connect directly. On a 5 V board such as a classic Arduino Uno, use a
   level shifter if you see corrupted data.

## 3.2 Wiring to the official CP2102 USB adapter

The kit's USB adapter is pre-wired; the manual's diagram (p. 11) maps it as follows:

| Lidar pin | Adapter pin |
|---|---|
| 1 Tx | RXD |
| 2 PWM | TXD (the adapter drives the PWM input) |
| 3 GND | GND |
| 4 P5V | +5V |

The adapter's +3.3V pin is not used. Because the adapter connects its TXD line to the PWM
pin, the PC software can change the motor speed over the same USB cable.

# 4. Rotation speed control

The LD06 can control its own speed or accept an external PWM signal (manual p. 4).

**Internal control (default).** With the PWM pin grounded, the motor runs under internal
control at **10 ± 0.1 Hz**, reaching that speed within 3 seconds of power-up.

**External control.** To switch to external control:

- Apply a square wave to pin 2 with a frequency of **20-50 kHz** (30 kHz recommended).
- Set the duty cycle **between 45% and 55%, exclusive**, and hold it for **at least 100 ms**.
- Once triggered, the lidar stays in external mode until it is powered off and on again.
- After triggering, the duty cycle sets the rotation speed.

Because motors differ from unit to unit, the actual speed for a given duty cycle varies. For
precise control, read the **speed field** in the received packets and close the loop (the
manual suggests a PID controller). To return to internal control, power cycle the lidar with
pin 2 grounded.

# 5. Serial communication

Communication is **one-way**: the lidar sends continuously and accepts no commands over the
data line (manual p. 4).

| Parameter | Value |
|---|---|
| Baud rate | 230400 bit/s |
| Data bits | 8 |
| Stop bits | 1 |
| Parity | None |
| Flow control | None |

# 6. Data packet format

After power-up and a stable rotation speed, the lidar streams fixed **47-byte** packets.
Each packet contains 12 measurements (manual p. 5, p. 8):

| Offset | Size | Field | Description |
|---|---|---|---|
| 0 | 1 byte | Header | Fixed value 0x54 |
| 1 | 1 byte | VerLen | Fixed value 0x2C: high 3 bits = frame type 1, low 5 bits = 12 points |
| 2 | 2 bytes | Speed | Rotation speed in degrees per second, little-endian |
| 4 | 2 bytes | Start angle | Angle of the first point, unit 0.01 degree, little-endian |
| 6 | 36 bytes | Data | 12 measurement points, 3 bytes each |
| 42 | 2 bytes | End angle | Angle of the last point, unit 0.01 degree, little-endian |
| 44 | 2 bytes | Timestamp | Milliseconds, little-endian; counts up to 30000 then restarts |
| 46 | 1 byte | CRC8 | Checksum of all preceding bytes (offsets 0-45) |

Notes:

- **VerLen** is 0x2C because the top three bits encode frame type 1 and the low five bits
  encode the point count 12.
- **Timestamp** wraps at **30000 ms** (about 30 seconds), not at 65535.
- **CRC8** uses the table printed in the manual (p. 6); it is equivalent to polynomial
  **0x4D** with initial value 0, computed over bytes 0-45.

Each 3-byte measurement is:

| Byte | Field | Description |
|---|---|---|
| +0 | Distance LSB | Low byte of the distance in **millimetres** |
| +1 | Distance MSB | High byte of the distance in millimetres |
| +2 | Intensity | Signal strength, 0-255 |

A distance of **0 means no valid echo** (no target, too close, or a target that reflects
poorly) and should be skipped. Intensity reflects how much light came back: for a white
object within 6 m the manual quotes a typical value of about **200** (p. 8).

## 6.1 Worked example from the manual

The manual gives this packet (p. 9):

```
54 2C 68 08 AB 7E E0 00 E4 DC 00 E2 D9 00 E5 D5 00 E3 D3 00 E4 D0 00 E9 CD
00 E4 CA 00 E2 C7 00 E9 C5 00 E5 C2 00 E5 C0 00 E5 BE 82 3A 1A 50
```

Decoding the fields:

| Field | Bytes | Result |
|---|---|---|
| Speed | 68 08 | 0x0868 = 2152 degrees/s |
| Start angle | AB 7E | 0x7EAB = 32427, i.e. 324.27 degrees |
| Point 1 | E0 00 E4 | distance 0x00E0 = 224 mm, intensity 228 |
| Point 2 | DC 00 E2 | distance 0x00DC = 220 mm, intensity 226 |
| End angle | BE 82 | 0x82BE = 33470, i.e. 334.70 degrees |
| Timestamp | 3A 1A | 0x1A3A = 6714 ms |
| CRC | 50 | matches the computed CRC8 |

One discrepancy: the manual's summary table lists point 12 as 176 mm with intensity 234,
but the packet bytes for point 12 are `C0 00 E5`, which decode to **192 mm and 229**. The
byte-level decoding is consistent with the CRC, start angle and end angle, so treat the
table entry as a typo.

## 6.2 Calculating each point's angle

The 12 points are evenly spaced between the start and end angle. The manual gives
(p. 8):

```
step  = (end_angle - start_angle) / (len - 1)
angle = start_angle + step * i          # i = 0 ... len-1
```

Here `len` is the number of points in the packet (12), so the divisor is 11. The result is in
degrees. If a packet crosses the 0/360 degree boundary (end angle smaller than start angle),
add 360 to the end angle before calculating the step.

For the example: step = (334.70 - 324.27) / 11 = 0.948 degrees; the first point is at
324.27 degrees and the twelfth at 334.70 degrees.

# 7. Reference Python decoder

This program reads packets, verifies the CRC and prints one point per packet. It uses
`pyserial` (`pip install pyserial`).

```python
import serial

PORT = "/dev/ttyUSB0"      # Windows example: "COM4"
BAUD = 230400
POINTS_PER_PACKET = 12


def crc8(data):
    """CRC-8 used by the LD06/LD19 (polynomial 0x4D, initial value 0)."""
    crc = 0
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x4D) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc


def read_packet(ser):
    """Find the 0x54 header, then read the remaining 46 bytes."""
    while True:
        byte = ser.read(1)
        if not byte:
            return None
        if byte[0] != 0x54:
            continue
        rest = ser.read(46)
        if len(rest) < 46:
            return None
        packet = byte + rest
        if packet[1] != 0x2C:
            continue
        if crc8(packet[:46]) != packet[46]:
            continue
        return packet


def decode(packet):
    speed = packet[2] | (packet[3] << 8)              # degrees per second
    start = (packet[4] | (packet[5] << 8)) / 100.0   # degrees
    end = (packet[42] | (packet[43] << 8)) / 100.0
    timestamp = packet[44] | (packet[45] << 8)       # milliseconds

    span = end - start
    if span < 0:
        span += 360.0
    step = span / (POINTS_PER_PACKET - 1)

    points = []
    for i in range(POINTS_PER_PACKET):
        offset = 6 + i * 3
        distance_mm = packet[offset] | (packet[offset + 1] << 8)
        intensity = packet[offset + 2]
        if distance_mm == 0:
            continue
        angle = (start + step * i) % 360.0
        points.append((angle, distance_mm, intensity))
    return speed, timestamp, points


ser = serial.Serial(PORT, BAUD, timeout=1)
print("Reading the LD06/LD19 - press Ctrl+C to stop")

while True:
    packet = read_packet(ser)
    if packet is None:
        continue
    speed, timestamp, points = decode(packet)
    if points:
        angle, distance_mm, intensity = points[0]
        print(f"speed={speed:4d} deg/s  t={timestamp:5d} ms  "
              f"angle={angle:6.2f} deg  distance={distance_mm / 1000:5.2f} m  "
              f"intensity={intensity}")
```

Expected output is a continuous stream of plausible distances (for example 0.2-6 m indoors)
and a speed close to 3600 degrees/s at the default 10 Hz.

## 7.1 Quick check that data is arriving

```bash
python -m serial.tools.miniterm /dev/ttyUSB0 230400
```

You should see binary data flowing, with many `54 2c` sequences. Press `Ctrl+]` to exit. No
data at all points to a wiring or port problem; readable text or a slow trickle usually means
the baud rate is wrong.

# 8. Coordinate system

The manual defines a **left-handed coordinate system** (p. 10):

- The origin is the centre of rotation.
- **0 degrees is the sensor's forward direction**, marked by the triangle on the top cover.
- The angle **increases clockwise**, covering 0 to 360 degrees.

To convert a measurement to Cartesian coordinates:

```
x = distance * cos(angle_in_radians)     # forward
y = distance * sin(angle_in_radians)     # to the right, because the system is left-handed
```

If you plot `(x, y)` on a normal chart where the y axis points up, the image will appear
mirrored. Either negate y when plotting or remember the handedness. Mounting the sensor
upside down or rotated also changes the map, so record how it is mounted.

# 9. Quick start with the USB adapter on Windows

1. Install the CP2102 USB-to-UART driver. The manual points to Silicon Labs (p. 12):
   `https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers`, or the vendor's
   releases page: `https://github.com/ldrobotSensorTeam/ld_desktop_tool/releases`.
2. Connect the adapter to the PC and open **Device Manager > Ports** to find the COM port
   (for example COM4).
3. Download and run **LdsPointCloudViewer** from the same releases page, select the product
   model and COM port, then start the viewer (manual p. 14).
4. The viewer shows three figures: **Speed** (scan frequency in Hz), **Rate** (packet
   parsing rate) and **Valid** (valid points per revolution). At 10 Hz you should see about
   10 Hz and a healthy number of valid points.

# 10. Linux and Raspberry Pi quick start

1. Connect the adapter and list the device:

```bash
ls /dev/ttyUSB*
```

2. Give your user access. The manual uses `sudo chmod 777 /dev/ttyUSB*` (p. 16); that works
   but resets on replug. A more permanent option is to add yourself to the `dialout` group
   and log in again:

```bash
sudo usermod -aG dialout $USER
```

3. Run the reference decoder with `PORT = "/dev/ttyUSB0"`.

For Raspberry Pi specifics, the v2.5 manual refers to a separate document, *LDRobot_LD06
Raspberry Pi Raspbian User manual V2.9*, and to a prepared image whose instructions are at
`https://github.com/ldrobotSensorTeam/ldlidar_stl_ros/wiki/raspios-buster-customization-cn`
(manual p. 25). In general, the Pi's UART is 3.3 V and can connect directly; use a 5 V supply
that can handle the motor, and join the grounds.

# 11. ROS, ROS 2 and the SDK

The manual documents official packages on GitHub and Gitee.

## 11.1 ROS (Kinetic, Melodic, Noetic)

```bash
mkdir -p ~/ldlidar_ros_ws/src
cd ~/ldlidar_ros_ws/src
git clone https://github.com/ldrobotSensorTeam/ldlidar_stl_ros.git

sudo chmod 777 /dev/ttyUSB*
# edit launch/ld19.launch and set port_name to your device

cd ~/ldlidar_ros_ws
catkin_make
source devel/setup.bash
roslaunch ldlidar_stl_ros ld19.launch
# point cloud display (choose the launch file for your ROS version):
roslaunch ldlidar_stl_ros viewer_ld19_noetic.launch
```

## 11.2 ROS 2 (Foxy and newer)

```bash
mkdir -p ~/ldlidar_ros2_ws/src
cd ~/ldlidar_ros2_ws/src
git clone https://github.com/ldrobotSensorTeam/ldlidar_stl_ros2.git

cd ~/ldlidar_ros2_ws
colcon build
source install/setup.bash
ros2 launch ldlidar_stl_ros2 ld19.launch.py
ros2 launch ldlidar_stl_ros2 viewer_ld19.launch.py
```

Edit `launch/ld19.launch.py` to match your serial port. For older ROS 1 versions use
`viewer_ld19_kinetic_melodic.launch` instead.

## 11.3 Linux SDK (C/C++)

```bash
mkdir -p ~/ldlidar_ws
cd ~/ldlidar_ws
git clone https://github.com/ldrobotSensorTeam/ldlidar_stl_sdk.git

cd ldlidar_stl_sdk
mkdir build
cd build
cmake ..
make
./ldlidar_stl /dev/ttyUSB0
```

Source repositories: `https://github.com/ldrobotSensorTeam/ldlidar_stl_ros`,
`https://github.com/ldrobotSensorTeam/ldlidar_stl_ros2`,
`https://github.com/ldrobotSensorTeam/ldlidar_stl_sdk`. Gitee mirrors exist under the same
project names.

# 12. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| No /dev/ttyUSB* on Linux | Driver missing, or cable not detected | Check `dmesg` after plugging in; install the CP2102 driver |
| Device exists but no data | Tx not connected to RX, or PWM pin floating | Cross-check pin 1 to host RX; connect PWM to GND |
| Garbage bytes, no 0x54 0x2C | Wrong baud rate or noisy wiring | Use 230400 8N1; shorten wires; check ground |
| Packets found but CRC fails | Noise, wrong grouping, or a damaged USB adapter | Verify 47-byte alignment; check wiring; try the CRC check disabled to inspect data |
| All distances zero | Motor not spinning, or no reflective target | Listen for the motor; test against a wall at 1-2 m |
| Distances unreliable | Black, transparent or mirror-like targets; dirty window | Clean the window; test with a matte white surface |
| Speed not about 3600 degrees/s | The lidar latched into external PWM mode | Power off, ground pin 2, power on again |
| Lidar does not spin at power-up | PWM input floating (internal control not selected) | Connect pin 2 to GND |
| PC/Raspberry Pi resets when the lidar starts | Supply cannot handle motor current | Use a stronger 5 V supply or a separate supply with a common ground |
| Viewer shows few valid points | Environment or window contamination | Clean the window; scan a normal room |

# 13. Safety

- The sensor emits infrared laser light. Do not look into the emitter aperture and do not
  point the sensor at anyone's eyes at close range. Follow the laser label on the product.
- The optical head spins at about 10 revolutions per second. Mount the sensor securely and
  keep fingers away while it is powered.
- Power off before changing wiring.
- Keep the optical window clean; dust and fingerprints reduce range and intensity.

# 14. Pre-flight checklist

- [ ] 5 V measured at pins 4 and 3 while the lidar is connected
- [ ] Pin 2 (PWM) connected to GND for internal speed control
- [ ] Pin 1 (Tx) connected to the host's RX
- [ ] Grounds common
- [ ] Host UART set to 230400, 8N1, no flow control
- [ ] Packets contain 0x54 0x2C and pass the CRC check
- [ ] Speed field is about 3600 degrees/s
- [ ] Distances are plausible against a known wall

## Links from the manual

- CP2102 driver: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- Desktop tool and viewer: https://github.com/ldrobotSensorTeam/ld_desktop_tool/releases
- 3D model (STP): https://github.com/ldrobotSensorTeam/Product_3D_model/releases
- ROS package: https://github.com/ldrobotSensorTeam/ldlidar_stl_ros
- ROS 2 package: https://github.com/ldrobotSensorTeam/ldlidar_stl_ros2
- Linux SDK: https://github.com/ldrobotSensorTeam/ldlidar_stl_sdk
- Raspberry Pi image instructions: https://github.com/ldrobotSensorTeam/ldlidar_stl_ros/wiki/raspios-buster-customization-cn