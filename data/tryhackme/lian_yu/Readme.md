```css
title: "Tryhackme - LIan_yu"
author: mayomacam
date: "2020-06-14"
subject: "CTF Writeup"
keywords: [Tryhackme, CTF, Security]
logo : url("/1.png")
```

Lian_yu is a beginner friendly enumeration challange on tryhackme. It's require more enumeration for foothold. 

# Information Gathering

## Nmap
We begin our reconnaissance by running an Nmap scan checking default scripts and testing for vulnerabilities.

```markdown
sudo update-alternatives --config java
┌─[mayomacam@parrot]─[~]
└──╼ $sudo nmap -A -sV -O -sC -p0-10000 10.10.183.249
[sudo] password for mayomacam: 
Starting Nmap 7.80 ( https://nmap.org ) at 2020-06-07 15:40 IST
Nmap scan report for 10.10.183.249
Host is up (0.17s latency).
Not shown: 9997 closed ports
PORT    STATE SERVICE VERSION
21/tcp  open  ftp     vsftpd 3.0.2
22/tcp  open  ssh     OpenSSH 6.7p1 Debian 5+deb8u8 (protocol 2.0)
| ssh-hostkey: 
|   1024 56:50:bd:11:ef:d4:ac:56:32:c3:ee:73:3e:de:87:f4 (DSA)
|   2048 39:6f:3a:9c:b6:2d:ad:0c:d8:6d:be:77:13:07:25:d6 (RSA)
|   256 a6:69:96:d7:6d:61:27:96:7e:bb:9f:83:60:1b:52:12 (ECDSA)
|_  256 3f:43:76:75:a8:5a:a6:cd:33:b0:66:42:04:91:fe:a0 (ED25519)
80/tcp  open  http    Apache httpd
|_http-server-header: Apache
|_http-title: Purgatory
111/tcp open  rpcbind 2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100000  3,4          111/tcp6  rpcbind
|   100000  3,4          111/udp6  rpcbind
|   100024  1          35429/tcp6  status
|   100024  1          36338/udp   status
|   100024  1          40837/tcp   status
|_  100024  1          53071/udp6  status
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.80%E=4%D=6/7%OT=21%CT=1%CU=43793%PV=Y%DS=2%DC=T%G=Y%TM=5EDCBDC5
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=108%GCD=1%ISR=10A%TI=Z%CI=I%II=I%TS=A)SEQ(
OS:SP=108%GCD=2%ISR=10A%TI=Z%II=I%TS=8)OPS(O1=M508ST11NW6%O2=M508ST11NW6%O3
OS:=M508NNT11NW6%O4=M508ST11NW6%O5=M508ST11NW6%O6=M508ST11)WIN(W1=68DF%W2=6
OS:8DF%W3=68DF%W4=68DF%W5=68DF%W6=68DF)ECN(R=Y%DF=Y%T=40%W=6903%O=M508NNSNW
OS:6%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF
OS:=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=
OS:%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=
OS:0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RI
OS:PCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 5900/tcp)
HOP RTT       ADDRESS
1   202.99 ms 10.8.0.1
2   207.86 ms 10.10.183.249

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 181.66 seconds
```
From the above output we can see that ports, **21**, **22**, **80**, and **111** are the ports open. 
Run gobuster on website for directories.

![gobuster](./2.png)

and island folder . When we go to location we find a file.
![wfuzz](./3.png)

again run gobuster with 4 digit numbers (here i have use hint)
![wfuzz](./4.png)

we find a directory 2100 and when we go there we see a webpage.
![2100](./5.png)

when we inspect element we get some data .
![2100](./6.png)

again we do enumeration but can't find anything. Then i look at all data i have then in 2100 index page we find .ticket extension. Now run wfuzz to get it
![2100](./7.png)

we find green_arrow.ticket file and we open it and we get some type of hash of key.
![ticket](./8.png)

we decode hash on cyberchef to get the pass .
![ftp-pass](./9.png)

# Exploitation

Now we have pass for what , when we look back we got vigilante word on island pageand it is a code word and code word can also be username. Now all i have to do try user and pass so try on ftp first.
![ftp](./10.png)

we got 3 files from ftp server and because of beginner challange i think may be stego can be here so i try stego on aa.jpg image first and i got some files with stegcracker.
![steg](./12.png)

## User Flag
After analyzing files we get we got data about our second user. oliver is our sencond user during ftp search. With user and pass we login.
![login](./13.png)

And got our user flag.

## Root Flag

The privilege escalation for this box was not hard, but for starting i tried to find in history and other files for some data we can't find anything.
![file](./14.png)

Then i sudo permissions and got how to get to the root.
![file](./15.png)

then using pkexec we got root shell and our root flag.
![Root](./16.png)



# Conclusion
It's a beginner friendly so it's simple , here enumeration is biggest problem. I enjoy a lot this box.
# Information Gathering

## Nmap
We begin our reconnaissance by running an Nmap scan checking default scripts and testing for vulnerabilities.

```markdown
sudo update-alternatives --config java
┌─[mayomacam@parrot]─[~]
└──╼ $sudo nmap -A -sV -O -sC -p0-10000 10.10.183.249
[sudo] password for mayomacam: 
Starting Nmap 7.80 ( https://nmap.org ) at 2020-06-07 15:40 IST
Nmap scan report for 10.10.183.249
Host is up (0.17s latency).
Not shown: 9997 closed ports
PORT    STATE SERVICE VERSION
21/tcp  open  ftp     vsftpd 3.0.2
22/tcp  open  ssh     OpenSSH 6.7p1 Debian 5+deb8u8 (protocol 2.0)
| ssh-hostkey: 
|   1024 56:50:bd:11:ef:d4:ac:56:32:c3:ee:73:3e:de:87:f4 (DSA)
|   2048 39:6f:3a:9c:b6:2d:ad:0c:d8:6d:be:77:13:07:25:d6 (RSA)
|   256 a6:69:96:d7:6d:61:27:96:7e:bb:9f:83:60:1b:52:12 (ECDSA)
|_  256 3f:43:76:75:a8:5a:a6:cd:33:b0:66:42:04:91:fe:a0 (ED25519)
80/tcp  open  http    Apache httpd
|_http-server-header: Apache
|_http-title: Purgatory
111/tcp open  rpcbind 2-4 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2,3,4        111/tcp   rpcbind
|   100000  2,3,4        111/udp   rpcbind
|   100000  3,4          111/tcp6  rpcbind
|   100000  3,4          111/udp6  rpcbind
|   100024  1          35429/tcp6  status
|   100024  1          36338/udp   status
|   100024  1          40837/tcp   status
|_  100024  1          53071/udp6  status
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.80%E=4%D=6/7%OT=21%CT=1%CU=43793%PV=Y%DS=2%DC=T%G=Y%TM=5EDCBDC5
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=108%GCD=1%ISR=10A%TI=Z%CI=I%II=I%TS=A)SEQ(
OS:SP=108%GCD=2%ISR=10A%TI=Z%II=I%TS=8)OPS(O1=M508ST11NW6%O2=M508ST11NW6%O3
OS:=M508NNT11NW6%O4=M508ST11NW6%O5=M508ST11NW6%O6=M508ST11)WIN(W1=68DF%W2=6
OS:8DF%W3=68DF%W4=68DF%W5=68DF%W6=68DF)ECN(R=Y%DF=Y%T=40%W=6903%O=M508NNSNW
OS:6%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(R=Y%DF
OS:=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F=AR%O=
OS:%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T=40%W=
OS:0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RID=G%RI
OS:PCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 5900/tcp)
HOP RTT       ADDRESS
1   202.99 ms 10.8.0.1
2   207.86 ms 10.10.183.249

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 181.66 seconds
```
From the above output we can see that ports, **21**, **22**, **80**, and **111** are the ports open. 
Run gobuster on website for directories.

![gobuster](./2.png)

and island folder . When we go to location we find a file.
![wfuzz](./3.png)

again run gobuster with 4 digit numbers (here i have use hint)
![wfuzz](./4.png)

we find a directory 2100 and when we go there we see a webpage.
![2100](./5.png)

when we inspect element we get some data .
![2100](./6.png)

again we do enumeration but can't find anything. Then i look at all data i have then in 2100 index page we find .ticket extension. Now run wfuzz to get it
![2100](./7.png)

we find green_arrow.ticket file and we open it and we get some type of hash of key.
![ticket](./8.png)

we decode hash on cyberchef to get the pass .
![ftp-pass](./9.png)

# Exploitation

Now we have pass for what , when we look back we got vigilante word on island pageand it is a code word and code word can also be username. Now all i have to do try user and pass so try on ftp first.
![ftp](./10.png)

we got 3 files from ftp server and because of beginner challange i think may be stego can be here so i try stego on aa.jpg image first and i got some files with stegcracker.
![steg](./12.png)

## User Flag
After analyzing files we get we got data about our second user. oliver is our sencond user during ftp search. With user and pass we login.
![login](./13.png)

And got our user flag.

## Root Flag

The privilege escalation for this box was not hard, but for starting i tried to find in history and other files for some data we can't find anything.
![file](./14.png)

Then i sudo permissions and got how to get to the root.
![file](./15.png)

then using pkexec we got root shell and our root flag.
![Root](./16.png)



# Conclusion
It's a beginner friendly so it's simple , here enumeration is biggest problem. I enjoy a lot this box.
