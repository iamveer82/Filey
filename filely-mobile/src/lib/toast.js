import Toast from 'react-native-toast-message';

export function showToast({ type = 'success', title, message, duration = 3000 }) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
    position: 'top',
    topOffset: 60,
  });
}

export function toastSuccess(title, message) {
  showToast({ type: 'success', title, message });
}

export function toastError(title, message) {
  showToast({ type: 'error', title, message });
}

export function toastInfo(title, message) {
  showToast({ type: 'info', title, message });
}
