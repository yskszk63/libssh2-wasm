# syntax=docker/dockerfile:1.3-labs
FROM ubuntu:latest

RUN <<eot
apt update
DEBIAN_FRONTEND=noninteractive apt install openssh-server --no-install-recommends -y
apt clean
rm -rf /var/lib/apt/lists/*
mkdir /run/sshd
mkdir ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
eot

ADD ssh_host_ed25519_key /etc/ssh
ADD ssh_host_ed25519_key.pub /etc/ssh
ADD id_ed25519.pub /root/.ssh
ADD id_rsa.pub /root/.ssh

RUN cat ~/.ssh/*.pub > /root/.ssh/authorized_keys

CMD /usr/sbin/sshd -De -oLogLevel=DEBUG1
