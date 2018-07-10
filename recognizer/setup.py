#!/usr/bin/env python3

from distutils.core import setup

setup(name='juniQ_recognizer',
      version='1.0',
      description='Facial Recognizer for juniQ',
      author='myuon',
      author_email='ioi.joi.koi.loi@gmail.com',
      url='https://github.com/myuon/juniQ',
      packages=[],
      install_requires=[
          'opencv-python',
          'face_recognition',
          'matplotlib'
      ]
     )

