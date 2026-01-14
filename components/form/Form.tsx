import type {
  ReactElement,
  ReactNode,
} from 'react'
import type { DefaultValues, FieldValues } from 'react-hook-form'
import * as React from 'react'
import {
  Children,
  createElement,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { useForm } from 'react-hook-form'

interface FormProps<T extends FieldValues = FieldValues> {
  defaultValues?: DefaultValues<T>
  children: ReactNode
  onSubmit: (data: T) => void
}

export interface FormHandle {
  setValue: (name: string, value: any) => void
  getValue: (name: string) => any
  reset: (values?: any) => void
}

function FormComponent<T extends FieldValues = FieldValues>(
  { defaultValues, children, onSubmit }: FormProps<T>,
  ref: React.Ref<FormHandle>,
) {
  const methods = useForm<T>({ defaultValues })
  const { handleSubmit, setValue, getValues, reset } = methods

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    setValue: (name: string, value: any) => {
      setValue(name as any, value)
    },
    getValue: (name: string) => {
      return getValues(name as any)
    },
    reset: (values?: any) => {
      reset(values)
    },
  }))

  // Recursive function to inject register and control into nested children
  const injectProps = (children: ReactNode): ReactNode => {
    return Children.map(children, (child) => {
      if (!React.isValidElement(child))
        return child

      const childElement = child as ReactElement<any>

      // If this child has a name prop, inject register and control
      if (childElement.props.name) {
        return createElement(childElement.type, {
          ...childElement.props,
          register: methods.register,
          control: methods.control,
          key: childElement.props.name,
        })
      }

      // If this child has children, recursively process them
      if (childElement.props.children) {
        return createElement(childElement.type, {
          ...childElement.props,
          children: injectProps(childElement.props.children),
        })
      }

      // Otherwise, return the child as-is
      return childElement
    })
  }

  return <form onSubmit={handleSubmit(onSubmit)}>{injectProps(children)}</form>
}

export const Form = forwardRef(FormComponent) as <
  T extends FieldValues = FieldValues,
>(
  props: FormProps<T> & { ref?: React.Ref<FormHandle> },
) => ReturnType<typeof FormComponent>
