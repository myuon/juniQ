#!/usr/bin/env python3
# coding:utf-8

from setuptools import setup

setup(name='juniQ-server',
      version='0.0.1',
      description='juniQ server',
      author='myuon',
      author_email='ioi.joi.koi.loi@gmail.com',
      url='https://github.com/myuon/juniQ',
      packages=['src'],
      install_requires=['Flask', 'Flask-SocketIO', 'numpy', 'face_recognition', 'opencv-python'],
    )
