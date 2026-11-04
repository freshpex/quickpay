import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Input, type InputProps } from "./Input";
import { PasswordInput } from "../password-input";
export function FormField<T extends FieldValues>({control, name, password = false, ...props}: Omit<InputProps, "value" | "onChangeText"> & {control: Control<T>; name: Path<T>; password?: boolean}) {
  return <Controller control={control} name={name} render={({field: {value, onChange, onBlur, ref}, fieldState}) => password ? <PasswordInput {...props} value={value || ""} onChangeText={onChange} onBlur={onBlur} error={fieldState.error?.message} /> : <Input {...props} ref={ref} value={value || ""} onChangeText={onChange} onBlur={onBlur} error={fieldState.error?.message} />} />;
}
