import cv2
import dlib
import numpy as np
from imutils import face_utils
from pathlib import Path

face_landmark_path = Path(__file__).parent.parent / 'data/shape_predictor_68_face_landmarks.dat'

K = [6.5308391993466671e+002, 0.0, 3.1950000000000000e+002,
     0.0, 6.5308391993466671e+002, 2.3950000000000000e+002,
     0.0, 0.0, 1.0]
D = [7.0834633684407095e-002, 6.9140193737175351e-002, 0.0, 0.0, -1.3073460323689292e+000]

cam_matrix = np.array(K).reshape(3, 3).astype(np.float32)
dist_coeffs = np.array(D).reshape(5, 1).astype(np.float32)

object_pts = np.float32([
  [6.825897, 6.760612, 4.402142],
  [1.330353, 7.122144, 6.903745],
  [-1.330353, 7.122144, 6.903745],
  [-6.825897, 6.760612, 4.402142],
  [5.311432, 5.485328, 3.987654],
  [1.789930, 5.393625, 4.413414],
  [-1.789930, 5.393625, 4.413414],
  [-5.311432, 5.485328, 3.987654],
  [2.005628, 1.409845, 6.165652],
  [-2.005628, 1.409845, 6.165652],
  [2.774015, -2.080775, 5.048531],
  [-2.774015, -2.080775, 5.048531],
  [0.000000, -3.116408, 6.097667],
  [0.000000, -7.415691, 4.070434]
  ])

reproject_src = np.float32([
  [10.0, 10.0, 10.0],
  [10.0, 10.0, -10.0],
  [10.0, -10.0, -10.0],
  [10.0, -10.0, 10.0],
  [-10.0, 10.0, 10.0],
  [-10.0, 10.0, -10.0],
  [-10.0, -10.0, -10.0],
  [-10.0, -10.0, 10.0]])

line_pairs = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
  ]

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(str(face_landmark_path))

def get_head_pose(shape):
  image_pts = np.float32([
    shape[17], shape[21], shape[22], shape[26], shape[36],
    shape[39], shape[42], shape[45], shape[31], shape[35],
    shape[48], shape[54], shape[57], shape[8]
  ])

  _, rotation_vec, translation_vec = cv2.solvePnP(object_pts, image_pts, cam_matrix, dist_coeffs)
  reproject_dst, _ = cv2.projectPoints(reproject_src, rotation_vec, translation_vec, cam_matrix, dist_coeffs)
  reproject_dst = reproject_dst.reshape(8,2).tolist()

  rotation_mat, _ = cv2.Rodrigues(rotation_vec)
  pose_mat = cv2.hconcat((rotation_mat, translation_vec))
  _, _, _, _, _, _, euler_angle = cv2.decomposeProjectionMatrix(pose_mat)

  return reproject_dst, np.squeeze(euler_angle)

def create_parts_list(shape):
  return {
    'chin': shape[0:17].tolist(),
    'left_eyebrow': shape[17:22].tolist(),
    'right_eyebrow': shape[22:27].tolist(),
    'nose_bridge': shape[27:31].tolist(),
    'nose_tip': shape[31:36].tolist(),
    'right_eye': shape[36:42].tolist(),
    'left_eye': shape[42:48].tolist(),
    'outer_lip': shape[48:60].tolist(),
    'inner_lip': shape[60:68].tolist(),
  }

def predict(frame):
  face_rects = detector(frame, 0)

  if len(face_rects) > 0:
    shape = predictor(frame, face_rects[0])
    shape = face_utils.shape_to_np(shape)
    reproject_dst, euler_angle = get_head_pose(shape)

    return list(map(lambda pair: [reproject_dst[pair[0]], reproject_dst[pair[1]]], line_pairs)), euler_angle, create_parts_list(shape)
