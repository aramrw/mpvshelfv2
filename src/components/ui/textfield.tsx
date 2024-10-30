import { cn } from "../../libs/cn";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import type {
	TextFieldDescriptionProps,
	TextFieldErrorMessageProps,
	TextFieldInputProps,
	TextFieldLabelProps,
	TextFieldRootProps,
} from "@kobalte/core/text-field";
import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import { cva } from "class-variance-authority";
import type { ValidComponent, VoidProps } from "solid-js";
import { splitProps } from "solid-js";

type textFieldProps<T extends ValidComponent = "div"> =
	TextFieldRootProps<T> & {
		class?: string;
	};

export const TextFieldRoot = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, textFieldProps<T>>,
) => {
	const [local, rest] = splitProps(props as textFieldProps, ["class"]);

	return <TextFieldPrimitive class={cn("", local.class)} {...rest} />;
};

export const textfieldLabel = cva(
	"text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70 font-medium",
	{
		variants: {
			label: {
				true: "data-[invalid]:text-destructive",
			},
			error: {
				true: "text-destructive text-xs",
			},
			description: {
				true: "font-normal text-muted-foreground",
			},
		},
		defaultVariants: {
			label: true,
		},
	},
);

type textFieldLabelProps<T extends ValidComponent = "label"> =
	TextFieldLabelProps<T> & {
		class?: string;
	};

export const TextFieldLabel = <T extends ValidComponent = "label">(
	props: PolymorphicProps<T, textFieldLabelProps<T>>,
) => {
	const [local, rest] = splitProps(props as textFieldLabelProps, ["class"]);

	return (
		<TextFieldPrimitive.Label
			class={cn(textfieldLabel(), "text-xs", local.class)}
			{...rest}
		/>
	);
};

type textFieldErrorMessageProps<T extends ValidComponent = "div"> =
	TextFieldErrorMessageProps<T> & {
		class?: string;
	};

export const TextFieldErrorMessage = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, textFieldErrorMessageProps<T>>,
) => {
	const [local, rest] = splitProps(props as textFieldErrorMessageProps, [
		"class",
	]);

	return (
		<TextFieldPrimitive.ErrorMessage
			class={cn(textfieldLabel({ error: true }), local.class)}
			{...rest}
		/>
	);
};

type textFieldDescriptionProps<T extends ValidComponent = "div"> =
	TextFieldDescriptionProps<T> & {
		class?: string;
	};

export const TextFieldDescription = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, textFieldDescriptionProps<T>>,
) => {
	const [local, rest] = splitProps(props as textFieldDescriptionProps, [
		"class",
	]);

	return (
		<TextFieldPrimitive.Description
			class={cn(
				textfieldLabel({ description: true, label: false }),
				local.class,
			)}
			{...rest}
		/>
	);
};

type textFieldInputProps<T extends ValidComponent = "input"> = VoidProps<
	TextFieldInputProps<T> & {
		class?: string;
	}
>;

export const TextField = <T extends ValidComponent = "input">(
	props: PolymorphicProps<T, textFieldInputProps<T>>,
) => {
	const [local, rest] = splitProps(props as textFieldInputProps, ["class"]);

	return (
		<TextFieldPrimitive.Input
			class={cn(
				"font-medium text-xs m-0 flex h-fit w-fit rounded-none border border-muted bg-transparent p-1 shadow-sm transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placehoreground focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-muted disabled:cursor-not-allowed disabled:opacity-50",
				local.class,
			)}
			{...rest}
		/>
	);
};
