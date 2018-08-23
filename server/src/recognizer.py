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
  [6.825897, 6.760612, 4.402142], # 17
  [1.330353, 7.122144, 6.903745], # 21
  [-1.330353, 7.122144, 6.903745], # 22
  [-6.825897, 6.760612, 4.402142], # 26
  [5.311432, 5.485328, 3.987654], # 36
  [1.789930, 5.393625, 4.413414], # 39
  [-1.789930, 5.393625, 4.413414], # 42
  [-5.311432, 5.485328, 3.987654], # 45
  [2.005628, 1.409845, 6.165652], # 31
  [-2.005628, 1.409845, 6.165652], # 35
  [2.774015, -2.080775, 5.048531], # 48
  [-2.774015, -2.080775, 5.048531], # 54
  [0.000000, -3.116408, 6.097667], # 57
  [0.000000, -7.415691, 4.070434] # 8
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

def decompose(shape):
  image_pts = np.float32([
    shape[17],
    shape[21],
    shape[22],
    shape[26],
    shape[36],
    shape[39],
    shape[42],
    shape[45],
    shape[31],
    shape[35],
    shape[48],
    shape[54],
    shape[57],
    shape[8],
  ])

  _, rotation_vec, translation_vec = cv2.solvePnP(object_pts, image_pts, cam_matrix, dist_coeffs)
  reproject_dst, _ = cv2.projectPoints(reproject_src, rotation_vec, translation_vec, cam_matrix, dist_coeffs)
  reproject_dst = reproject_dst.reshape(8,2).tolist()
  rotation_mat, _ = cv2.Rodrigues(rotation_vec)

  return reproject_dst, rotation_mat, rotation_vec, translation_vec

def get_head_pose_angles(rotation_mat, rotation_vec, translation_vec):
  new_rotation_mat = -np.matrix(rotation_mat).T * np.matrix(translation_vec)

  rotation_vec = np.array([
    new_rotation_mat[0],
    new_rotation_mat[1],
    rotation_vec[2] * 180 / np.pi,
  ])

  return rotation_vec.squeeze().tolist()

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

def eye_open_param(eye):
  h1 = np.linalg.norm(np.subtract(eye[1], eye[5]))
  h2 = np.linalg.norm(np.subtract(eye[2], eye[4]))
  h = (h1 + h2) / 2

  return (
    0.0 if h < 1.5 else
    1.0 if h > 4.0 else
    (h - 1.5) / 2.5
  )

def get_center(gray_img):
  moments = cv2.moments(gray_img, False)
  try:
    return int(moments['m10'] / moments['m00']), int(moments['m01'] / moments['m00'])
  except:
    return None

def detect_eye_center(img, shape):
  left_eye = [
    shape[36],
    min(shape[37], shape[38], key=lambda x: x[1]),
    max(shape[40], shape[41], key=lambda x: x[1]),
    shape[39],
  ]
  right_eye = [
    shape[42],
    min(shape[43], shape[44], key=lambda x: x[1]),
    max(shape[46], shape[47], key=lambda x: x[1]),
    shape[45],
  ]

  def get_eye_center(eye):
    origin = (eye[0][0], eye[1][1])
    if abs(eye[2][1] - origin[1]) < 2:
      return None

    eye = img[origin[1]:eye[2][1], origin[0]:eye[-1][0]]
    _, eye = cv2.threshold(eye, 30, 255, cv2.THRESH_BINARY_INV)

    center = get_center(eye)
    if center:
      return int(center[0] + origin[0]), int(center[1] + origin[1])
    
    return center

  def normalize_position(value, start, end):
    size = abs(end - start)
    return (value - (start + size / 2)) / (size / 2)

  left_pos = get_eye_center(left_eye)
  right_pos = get_eye_center(right_eye)

  if left_pos is None:
    left_normalized_pos = None
  else:
    left_normalized_pos = (
      normalize_position(
        left_pos[0],
        min(shape[37][0], shape[41][0]),
        max(shape[38][0], shape[40][0])
      ),
      normalize_position(
        left_pos[1],
        min(shape[37][1], shape[38][1]),
        min(shape[40][1], shape[41][1])
      )
    )

  return (
    (left_pos, right_pos),
    left_normalized_pos
  )

def mouse_open_param(shape):
  height = np.linalg.norm(shape[66] - shape[62])
  return (height - 3) / 7

def hand_predict(frame, face_rect):
  hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV_FULL)
  h = hsv[:,:,0]
  s = hsv[:,:,1]

  mask = np.zeros(h.shape, dtype=np.uint8)
  mask[((25 < h) | (h < 55)) & ((55 < s) & (s < 85))] = 255

  _, contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
  rects = [np.array(cv2.boundingRect(cv2.convexHull(contour))) for contour in contours]

  rectR = list(filter(lambda r: r[0] < face_rect.left(), rects))
  rectL = list(filter(lambda r: r[0] > face_rect.right(), rects))

  rectR = max(rectR, key=lambda r: r[2] * r[3]) if len(rectR) > 0 else None
  rectL = max(rectL, key=lambda r: r[2] * r[3]) if len(rectL) > 0 else None

  def center(rect):
    return (rect[0] + rect[2] / 2, rect[1] + rect[3] / 2)

  return {
    'right_hand': center(rectR) if rectR is not None and rectR[2] * rectR[3] >= 2000 else None,
    'left_hand': center(rectL) if rectL is not None and rectL[2] * rectL[3] >= 2000 else None,
  }

def get_body_pose(rect):
  # center_of_window = (160,120)
  center_of_face = (rect.left() + rect.width() / 2, rect.top() + rect.height() / 2)
  return 90 - (np.arctan2(240 - center_of_face[1], center_of_face[0] - 160)) * 180 / np.pi

should_detect = 0
face_rects = []

def predict(frame, original, resize):
  global should_detect, face_rects

  if should_detect == 0:
    face_rects = detector(frame, 0)
  should_detect = (should_detect + 1) % 3

  if len(face_rects) > 0:
    face_rect = dlib.rectangle(
      int(face_rects[0].left() * (1 / resize[0])),
      int(face_rects[0].top() * (1 / resize[1])),
      int(face_rects[0].right() * (1 / resize[0])),
      int(face_rects[0].bottom() * (1 / resize[1])),
    )

    shape = predictor(original, face_rect)
    shape = face_utils.shape_to_np(shape)
    reproject_dst, rotation_mat, rotation_vec, translation_vec = decompose(shape)
    original_parts_list = create_parts_list(np.array([np.dot(rotation_mat, np.array([p[0], p[1], 0])) for p in shape]))

    center = detect_eye_center(frame, shape)

    return {
      'reproject_dst': list(map(lambda pair: [reproject_dst[pair[0]], reproject_dst[pair[1]]], line_pairs)),
      'head_pose': get_head_pose_angles(rotation_mat, rotation_vec, translation_vec),
      'body_pose': get_body_pose(face_rect),
      'right_eye': eye_open_param(original_parts_list['right_eye']),
      'left_eye': eye_open_param(original_parts_list['left_eye']),
      'parts_list': create_parts_list(shape),
      'eye_center': center,
      'mouse': mouse_open_param(shape),
      'contour': hand_predict(original, face_rect),
      'face_rect': face_rect,
    }
