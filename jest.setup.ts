import "@/i18n";
import "react-native-gesture-handler/jestSetup";

type MockModifierList = { __modifier?: string; args?: unknown[] }[];
type MockSlotProps = {
  children?: React.ReactNode;
  modifiers?: MockModifierList;
};
type MockStateListener = (nextValue: unknown) => void;

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("expo-crypto", () => {
  let counter = 0;
  return { randomUUID: () => `test-uuid-${++counter}` };
});

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en" }],
}));

jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => "notification-id"),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

const noopPersistPlugin = () => ({
  getTable: () => ({}),
  set: () => undefined,
  setTable: () => undefined,
  getMetadata: () => undefined,
  setMetadata: () => undefined,
  deleteTable: () => undefined,
  deleteMetadata: () => undefined,
});

jest.mock("@legendapp/state/persist-plugins/mmkv", () => ({
  observablePersistMMKV: noopPersistPlugin,
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Pressable, Text, TextInput, View } = require("react-native");

  function Title({ children }: { children?: React.ReactNode }) {
    return React.createElement(Text, { testID: "stack-title" }, children);
  }

  function ToolbarButton(props: {
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    disabled?: boolean;
  }) {
    return React.createElement(Pressable, {
      testID: "stack-toolbar-button",
      accessibilityRole: "button",
      onPress: props.onPress,
      disabled: props.disabled,
      accessibilityLabel: props.accessibilityLabel,
      accessibilityHint: props.accessibilityHint,
      accessibilityState: { disabled: props.disabled },
    });
  }

  function ToolbarMenu(props: {
    children?: React.ReactNode;
    accessibilityLabel?: string;
    accessibilityHint?: string;
  }) {
    return React.createElement(
      View,
      {
        accessibilityLabel: props.accessibilityLabel,
        accessibilityHint: props.accessibilityHint,
      },
      props.children,
    );
  }

  function ToolbarMenuAction(props: {
    children?: React.ReactNode;
    onPress?: () => void;
  }) {
    return React.createElement(Pressable, {
      accessibilityRole: "button",
      accessibilityLabel: props.children,
      onPress: props.onPress,
    });
  }

  function Toolbar({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, { testID: "stack-toolbar" }, children);
  }
  Toolbar.Button = ToolbarButton;
  Toolbar.Menu = ToolbarMenu;
  Toolbar.MenuAction = ToolbarMenuAction;

  function Stack({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, null, children);
  }
  Stack.Title = Title;
  Stack.Toolbar = Toolbar;
  Stack.SearchBar = React.forwardRef(function SearchBar(
    props: {
      placeholder?: string;
      onChangeText?: (event: { nativeEvent: { text: string } }) => void;
      onCancelButtonPress?: () => void;
    },
    ref: React.ForwardedRef<{
      focus: () => void;
      blur: () => void;
      setText: (text: string) => void;
      clearText: () => void;
      cancelSearch: () => void;
    }>,
  ) {
    React.useImperativeHandle(ref, () => ({
      focus: jest.fn(),
      blur: jest.fn(),
      setText: jest.fn(),
      clearText: jest.fn(),
      cancelSearch: jest.fn(),
    }));

    return React.createElement(
      View,
      { testID: "stack-search-bar" },
      React.createElement(TextInput, {
        placeholder: props.placeholder,
        onChangeText: (text: string) =>
          props.onChangeText?.({ nativeEvent: { text } }),
      }),
      React.createElement(Pressable, {
        testID: "stack-search-cancel",
        onPress: props.onCancelButtonPress,
      }),
    );
  });

  const router = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  };

  return {
    Stack,
    router,
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(effect, [effect]);
    },
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

jest.mock("@expo/ui/swift-ui", () => {
  const React = require("react");
  const { Pressable, Text, TextInput, View } = require("react-native");

  function a11yProps(modifiers?: MockModifierList) {
    const arg = (name: string) =>
      modifiers?.find((modifier) => modifier?.__modifier === name)?.args?.[0];

    const label = arg("accessibilityLabel");
    const hint = arg("accessibilityHint");
    if (label == null && hint == null) return {};

    return {
      accessible: true,
      ...(label == null ? {} : { accessibilityLabel: label }),
      ...(hint == null ? {} : { accessibilityHint: hint }),
    };
  }

  function tapProps(modifiers?: MockModifierList) {
    const tap = modifiers?.find(
      (modifier) => modifier?.__modifier === "onTapGesture",
    );
    if (!tap) return undefined;

    return { onPress: tap.args?.[0] as (() => void) | undefined };
  }

  function stack(testID: string) {
    return function Stack({ children, modifiers }: MockSlotProps) {
      const tap = tapProps(modifiers);

      return React.createElement(
        tap ? Pressable : View,
        {
          testID,
          ...(tap ? { accessibilityRole: "button", ...tap } : {}),
          ...a11yProps(modifiers),
        },
        children,
      );
    };
  }

  const Host = stack("expo-ui-host");
  const VStack = stack("expo-ui-vstack");
  const HStack = stack("expo-ui-hstack");
  const ZStack = stack("expo-ui-zstack");

  function UIText({ children, modifiers }: MockSlotProps) {
    return React.createElement(Text, a11yProps(modifiers), children);
  }

  function UIImage({
    systemName,
    modifiers,
  }: {
    systemName?: string;
    modifiers?: MockModifierList;
  }) {
    return React.createElement(View, {
      testID: "expo-ui-image",
      accessibilityLabel: systemName,
      ...a11yProps(modifiers),
    });
  }

  function Rectangle() {
    return React.createElement(View, { testID: "expo-ui-rectangle" });
  }

  function Chart({
    modifiers,
    data,
  }: MockSlotProps & { data?: { x?: unknown }[] }) {
    return React.createElement(
      View,
      { testID: "expo-ui-chart", ...a11yProps(modifiers) },
      (data ?? []).map((point, index) =>
        React.createElement(Text, { key: index }, String(point?.x)),
      ),
    );
  }

  function ContentUnavailableView({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) {
    return React.createElement(
      View,
      { testID: "expo-ui-content-unavailable" },
      title == null ? null : React.createElement(Text, null, title),
      description == null ? null : React.createElement(Text, null, description),
    );
  }

  function Button({
    label,
    onPress,
    modifiers,
    children,
  }: {
    label?: string;
    onPress?: () => void;
    modifiers?: MockModifierList;
    children?: React.ReactNode;
  }) {
    return React.createElement(
      Pressable,
      {
        testID: "expo-ui-button",
        accessibilityRole: "button",
        accessibilityLabel: label,
        onPress,
        ...a11yProps(modifiers),
      },
      label == null ? children : React.createElement(Text, null, label),
    );
  }

  function Container({ children, modifiers }: MockSlotProps) {
    return React.createElement(View, a11yProps(modifiers), children);
  }

  function Section({
    title,
    header,
    footer,
    children,
    modifiers,
  }: MockSlotProps & {
    title?: string;
    header?: React.ReactNode;
    footer?: React.ReactNode;
  }) {
    return React.createElement(
      View,
      a11yProps(modifiers),
      title == null ? null : React.createElement(Text, null, title),
      header,
      children,
      footer,
    );
  }

  function LabeledContent({
    label,
    children,
    modifiers,
  }: MockSlotProps & { label?: React.ReactNode }) {
    return React.createElement(
      View,
      a11yProps(modifiers),
      typeof label === "string"
        ? React.createElement(Text, null, label)
        : label,
      children,
    );
  }

  function SwipeActions({ children, modifiers }: MockSlotProps) {
    return React.createElement(
      View,
      { testID: "expo-ui-swipe-actions", ...a11yProps(modifiers) },
      children,
    );
  }
  SwipeActions.Actions = function Actions({
    edge = "trailing",
    children,
  }: {
    edge?: string;
    children?: React.ReactNode;
  }) {
    return React.createElement(
      View,
      { testID: `expo-ui-swipe-actions-${edge}` },
      children,
    );
  };

  function useNativeState(initialValue: unknown) {
    return React.useRef({
      _value: initialValue,
      _listeners: new Set<MockStateListener>(),
      get() {
        return this._value;
      },
      set(nextValue: unknown) {
        this._value = nextValue;
        this._listeners.forEach((listener: MockStateListener) =>
          listener(nextValue),
        );
      },
    }).current;
  }

  function TextField({
    placeholder,
    text,
    onTextChange,
  }: {
    placeholder?: string;
    text?: {
      get: () => unknown;
      set?: (value: unknown) => void;
      _listeners?: Set<MockStateListener>;
    };
    onTextChange?: (value: string) => void;
  }) {
    const [value, setValue] = React.useState(() => String(text?.get() ?? ""));

    React.useEffect(() => {
      const listener = (nextValue: unknown) => setValue(String(nextValue));
      text?._listeners?.add(listener);
      return () => text?._listeners?.delete(listener);
    }, [text]);

    return React.createElement(TextInput, {
      placeholder,
      value,
      onChangeText: (nextValue: string) => {
        setValue(nextValue);
        text?.set?.(nextValue);
        onTextChange?.(nextValue);
      },
    });
  }

  function Toggle({
    label,
    isOn,
    onIsOnChange,
  }: {
    label?: string;
    isOn?: boolean;
    onIsOnChange?: (value: boolean) => void;
  }) {
    return React.createElement(Pressable, {
      accessibilityLabel: label,
      accessibilityRole: "switch",
      accessibilityState: { checked: isOn },
      onPress: () => onIsOnChange?.(!isOn),
    });
  }

  function Picker({
    children,
    modifiers,
    onSelectionChange,
  }: MockSlotProps & { onSelectionChange?: (value: string) => void }) {
    return React.createElement(
      View,
      {
        testID: "expo-ui-picker",
        onSelectionChange,
        ...a11yProps(modifiers),
      },
      children,
    );
  }

  return {
    Host,
    VStack,
    HStack,
    ZStack,
    Text: UIText,
    Image: UIImage,
    Rectangle,
    Circle: Rectangle,
    Button,
    Chart,
    BottomSheet: Container,
    ContentUnavailableView,
    DatePicker: Container,
    Divider: Rectangle,
    Form: Container,
    GlassEffectContainer: Container,
    LabeledContent,
    List: Container,
    Picker,
    ScrollView: Container,
    Section,
    Spacer: Container,
    SwipeActions,
    TextField,
    Toggle,
    useNativeState,
  };
});

jest.mock("@expo/ui/swift-ui/modifiers", () => {
  const modifier = (name: string): unknown =>
    new Proxy((...args: unknown[]) => ({ __modifier: name, args }), {
      get: (target, key) =>
        typeof key === "symbol" || key in target
          ? Reflect.get(target, key)
          : modifier(`${name}.${key}`),
    });

  return new Proxy(
    {},
    {
      get: (_target, name) =>
        name === "__esModule" ? true : modifier(String(name)),
    },
  );
});

jest.mock("@expo/ui/jetpack-compose", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  function a11yProps(modifiers?: MockModifierList) {
    const args = modifiers?.find(
      (modifier) => modifier?.__modifier === "semantics",
    )?.args?.[0] as { contentDescription?: string } | undefined;

    if (!args?.contentDescription) return {};

    return { accessible: true, accessibilityLabel: args.contentDescription };
  }

  function clickProps(modifiers?: MockModifierList) {
    const click = modifiers?.find(
      (modifier) => modifier?.__modifier === "clickable",
    );
    if (!click) return undefined;

    return { onPress: click.args?.[0] as (() => void) | undefined };
  }

  function container(testID: string) {
    return function Container({ children, modifiers }: MockSlotProps) {
      const click = clickProps(modifiers);

      return React.createElement(
        click ? Pressable : View,
        {
          testID,
          ...(click ? { accessibilityRole: "button", ...click } : {}),
          ...a11yProps(modifiers),
        },
        children,
      );
    };
  }

  const Host = container("expo-ui-host");
  const Box = container("expo-ui-box");
  const Column = container("expo-ui-column");
  const Row = container("expo-ui-row");
  const Surface = container("expo-ui-surface");

  function UIText({ children }: MockSlotProps) {
    return React.createElement(Text, null, children);
  }

  function Icon({ contentDescription }: { contentDescription?: string }) {
    return React.createElement(View, {
      testID: "expo-ui-icon",
      ...(contentDescription
        ? { accessible: true, accessibilityLabel: contentDescription }
        : {}),
    });
  }

  function ComposeButton({
    onClick,
    modifiers,
    children,
  }: MockSlotProps & { onClick?: () => void }) {
    return React.createElement(
      Pressable,
      {
        testID: "expo-ui-button",
        accessibilityRole: "button",
        onPress: onClick,
        ...a11yProps(modifiers),
      },
      children,
    );
  }

  function IconButton({
    onClick,
    children,
  }: MockSlotProps & { onClick?: () => void }) {
    return React.createElement(
      Pressable,
      {
        testID: "expo-ui-icon-button",
        accessibilityRole: "button",
        onPress: onClick,
      },
      children,
    );
  }

  function useNativeState(initialValue: unknown) {
    return React.useRef({
      _value: initialValue,
      _listeners: new Set<MockStateListener>(),
      get() {
        return this._value;
      },
      set(nextValue: unknown) {
        this._value = nextValue;
        this._listeners.forEach((listener: MockStateListener) =>
          listener(nextValue),
        );
      },
    }).current;
  }

  return {
    Host,
    Box,
    Column,
    Row,
    Surface,
    Text: UIText,
    Icon,
    Button: ComposeButton,
    IconButton,
    RNHostView: container("expo-ui-rn-host-view"),
    useNativeState,
  };
});

jest.mock("@expo/ui/jetpack-compose/modifiers", () => {
  const modifier = (name: string): unknown =>
    new Proxy((...args: unknown[]) => ({ __modifier: name, args }), {
      get: (target, key) =>
        typeof key === "symbol" || key in target
          ? Reflect.get(target, key)
          : modifier(`${name}.${key}`),
    });

  return new Proxy(
    {},
    {
      get: (_target, name) =>
        name === "__esModule" ? true : modifier(String(name)),
    },
  );
});
