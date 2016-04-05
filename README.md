# sue
sue is a sous-vide web server that runs on linux devices with GPIO (openwrt devices, raspberry pi, etc).
It allows the user to set a target temperature via a web page and monitor the temperature sensor for changes. The web server will toggle a relay to turn on/off a device (crock pot) based on the temperature sensor.

###### Parts

1. UnwiredOne (openwrt dev board)
2. ds18b20 (1-wire temperature sensor)
3. transistor (p2n2 222a)

###### Dependencies

1. node.js
2. kmod-w1-gpio-custom
3. kmod-w1-slave-therm

```
$ opkg update
$ opkg install kmod-w1-gpio-custom
$ opkg install kmod-w1-slave-therm
```

useful commands to check for for installed packages

```
$ opkg list-installed | grep -i w1
$ lsmod | grep -i w1
```

check for the module and create file if it does not loaded with the following info:

`w1-gpio-custom bus0=0,<GPIO_PIN>,0`

where GPIO_PIN is the pin connected to the ds18b20 data cable

```
$ nano /etc/modules.d/55-w1-gpio-custom
```

reboot device
```
$ reboot
```

###### Installing

1. move the files to the device (replace the ip with the ip of the device)

```
$ scp index.js root@192.168.1.10:/root/sue/
$ scp index.html root@192.168.1.10:/root/sue/
```

###### Running

1. edit `index.js` and change the `RELAY_PIN` to the data pin of the ds18b20 sensor
2. run the app

```
$ node index.js
```

access the web server from a browser
`127.0.0.1:8080` or by the device ip:8080
