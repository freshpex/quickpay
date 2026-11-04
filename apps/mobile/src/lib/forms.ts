import { useForm, type FieldValues, type DefaultValues, type Path } from "react-hook-form";
import { z } from "zod";
import { ApiFailure } from "@quickpay/api-client";
export function useValidatedForm<T extends FieldValues>(schema: z.ZodType, defaults: DefaultValues<T>) {
  const form = useForm<T>({defaultValues: defaults, mode: "onBlur"});
  const submit = (fn: (values: T) => Promise<void>) => form.handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue, i) => form.setError(issue.path.join(".") as Path<T>, {message: issue.message}, {shouldFocus: i === 0}));
      return;
    }
    try {await fn(parsed.data as T);} catch (error) {
      if (error instanceof ApiFailure && error.details.fields) Object.entries(error.details.fields).forEach(([name, messages], i) => form.setError(name as Path<T>, {message: messages[0]}, {shouldFocus: i === 0}));
      form.setError("root", {message: error instanceof Error ? error.message : "Please try again."});
    }
  });
  return {...form, submit};
}
