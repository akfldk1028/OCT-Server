import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from 'react-router';
import { z } from 'zod';
import { LoaderCircle, Route } from 'lucide-react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import { Button } from '../../../common/components/ui/button';
import InputPair from '../../../common/components/input-pair';
import AuthButtons from '../components/auth-buttons';
import { makeSSRClient } from '../../../supa-client';
import { checkUsernameExists } from '../queries';

export const meta = () => {
  return [{ title: 'Join | wemake' }];
};

const formSchema = z.object({
  name: z.string().min(3),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});

export const joinLoader = () => {
  return { title: 'Join | wemake' };
};

export const joinAction = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const { success, error, data } = formSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!success) {
    return {
      formErrors: error.flatten().fieldErrors,
    };
  }
  const usernameExists = await checkUsernameExists(request, {
    username: data.username,
  });
  if (usernameExists) {
    return {
      formErrors: { username: ['Username already exists'] },
    };
  }
  const { client, headers } = makeSSRClient(request);
  const { error: signUpError } = await client.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        username: data.username,
      },
    },
  });
  if (signUpError) {
    return {
      signUpError: signUpError.message,
    };
  }
  return redirect('/', { headers });
};

export default function JoinPage() {
  const navigation = useNavigation();
  const actionData = useActionData(); // useActionData 훅 추가
  const isSubmitting =
    navigation.state === 'submitting' || navigation.state === 'loading';
  return (
    <div className="flex flex-col relative items-center justify-center h-full">
      <Button
        variant="ghost"
        asChild
        className="md:absolute hidden right-8 top-8 "
      >
        <Link to="/auth/login">Login</Link>
      </Button>
      <div className="flex items-center flex-col justify-center w-full max-w-md gap-10">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <Form className="w-full space-y-4" method="post">
          <InputPair
            label="Name"
            description="Enter your name"
            name="name"
            id="name"
            required
            type="text"
            placeholder="Enter your name"
          />
          {actionData && 'formErrors' in actionData && (
            <p className="text-red-500">{actionData?.formErrors?.name}</p>
          )}
          <InputPair
            id="username"
            label="Username"
            description="Enter your username"
            name="username"
            required
            type="text"
            placeholder="i.e wemake"
          />
          {actionData && 'formErrors' in actionData && (
            <p className="text-red-500">{actionData?.formErrors?.username}</p>
          )}
          <InputPair
            id="email"
            label="Email"
            description="Enter your email address"
            name="email"
            required
            type="email"
            placeholder="i.e wemake@example.com"
          />
          {actionData && 'formErrors' in actionData && (
            <p className="text-red-500">{actionData?.formErrors?.email}</p>
          )}
          <InputPair
            id="password"
            label="Password"
            description="Enter your password"
            name="password"
            required
            type="password"
            placeholder="Enter your password"
          />
          {actionData && 'formErrors' in actionData && (
            <p className="text-red-500">{actionData?.formErrors?.password}</p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              'Create account'
            )}
          </Button>
          {actionData && 'signUpError' in actionData && (
            <p className="text-red-500">{actionData.signUpError}</p>
          )}
        </Form>
        <AuthButtons />
      </div>
    </div>
  );
}
