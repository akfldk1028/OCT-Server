// ./features/auth/pages/login-page.tsx
import {
  Form,
  Link,
  redirect,
  useNavigation,
  useActionData,
} from 'react-router';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../../common/components/ui/button';
import InputPair from '../../../common/components/input-pair';
import AuthButtons from '../components/auth-buttons';
import { makeSSRClient } from '../../../supa-client';

type MetaFunction = () => { title: string }[];
type ActionArgs = { request: Request };
type FormErrors = { [key: string]: string[] };
type ActionData = { formErrors?: FormErrors; loginError?: string };

export const meta: MetaFunction = () => {
  return [{ title: 'Login | wemake' }];
};

const formSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
      invalid_type_error: 'Email should be a string',
    })
    .email('Invalid email address'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(8, {
      message: 'Password must be at least 8 characters',
    }),
});

export const loginAction = async ({ request }: ActionArgs) => {
  const formData = await request.formData();
  const { success, data, error } = formSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!success) {
    return {
      loginError: null,
      formErrors: error.flatten().fieldErrors,
    };
  }
  const { email, password } = data;
  const { client, headers } = makeSSRClient(request);
  const { error: loginError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (loginError) {
    return {
      formErrors: null,
      loginError: loginError.message,
    };
  }
  return redirect('/', { headers });
};

export default function LoginPage() {
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;
  const isSubmitting =
    navigation.state === 'submitting' || navigation.state === 'loading';

  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <h1 className="text-2xl font-semibold">Log in to your account</h1>

        <AuthButtons />
      </div>
    </div>
  );
}
