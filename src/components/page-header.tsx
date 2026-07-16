import { Stack } from "expo-router";
import type { ComponentProps, ReactNode } from "react";

import { Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type StackToolbarButtonProps = ComponentProps<typeof Stack.Toolbar.Button>;

type IOSPageHeaderAction = Pick<
  StackToolbarButtonProps,
  "accessibilityHint" | "accessibilityLabel" | "icon" | "onPress" | "tintColor"
> & {
  key: string;
};

export type IOSPageHeaderProps = {
  title: string;
  actions?: readonly IOSPageHeaderAction[];
  menu?: ReactNode;
};

export function IOSPageHeader({ title, actions, menu }: IOSPageHeaderProps) {
  const theme = useTheme();
  const hasActions = actions && actions.length > 0;

  return (
    <>
      <Stack.Title
        large
        largeStyle={{
          fontFamily: Typography.displayXl.fontFamily,
          color: theme.text,
        }}
        style={{
          fontFamily: Typography.title.fontFamily,
          color: theme.text,
        }}
      >
        {title}
      </Stack.Title>
      {hasActions || menu ? (
        <Stack.Toolbar placement="right">
          {actions?.map(({ key, ...action }) => (
            <Stack.Toolbar.Button key={key} {...action} />
          ))}
          {menu}
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
