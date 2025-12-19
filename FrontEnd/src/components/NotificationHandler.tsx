import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";


const AUTO_CLOSE = 4000;

export function showLoading(title: string, message?: string) {
  return notifications.show({
    title: title,
    message: message? message : '',
    loading: true,
    autoClose: false,
  });
}

export function updateSuccess(id: string, title: string, message?: string) {
  notifications.update({
    id,
    title: title,
    message: message? message : '',
    loading: false,
    color: "teal",
    icon: <IconCheck />,
    autoClose: AUTO_CLOSE,
  });
}

export function updateError(id: string, title: string, message?: string) {
  notifications.update({
    id,
    title: title,
    message: message? message : '',
    loading: false,
    color: "red",
    icon: <IconX />,
    autoClose: AUTO_CLOSE,
  });
}

export function destroy(id: string) {
  notifications.hide(id);
}

export function message(title: string, message?: string) {
  return notifications.show({
    title: title,
    message: message? message : '',
    autoClose: AUTO_CLOSE,
  });
}

export function success(title: string, message?: string) {
  return notifications.show({
    title: title,
    message: message? message : '',
    color: "teal",
    autoClose: AUTO_CLOSE,
  });
}

export function error(title: string, message?: string) {
  return notifications.show({
    title: title,
    message: message? message : '',
    color: "red",
    autoClose: AUTO_CLOSE,
  });
}

export function loading(title: string, message?: string) {
  return notifications.show({
    title: title,
    message: message? message : '',
    loading: true,
    autoClose: AUTO_CLOSE,
  });
}

