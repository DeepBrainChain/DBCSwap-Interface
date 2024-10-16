import { useFocusEffect } from '@react-navigation/core'
import React, { RefObject, forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NativeSyntheticEvent, TextInput, TextInputSelectionChangeEventData } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import {
  ColorTokens,
  Flex,
  Text,
  TouchableArea,
  useHapticFeedback,
  useIsShortMobileDevice,
  useSporeColors,
} from 'ui/src'
import { errorShakeAnimation } from 'ui/src/animations/errorShakeAnimation'
import { AnimatedFlex } from 'ui/src/components/layout/AnimatedFlex'
import { useDeviceDimensions } from 'ui/src/hooks/useDeviceDimensions'
import { useDynamicFontSizing } from 'ui/src/hooks/useDynamicFontSizing'
import { fonts, spacing } from 'ui/src/theme'
import { AmountInput } from 'uniswap/src/components/CurrencyInputPanel/AmountInput'
import { Pill } from 'uniswap/src/components/pill/Pill'
import { useFormatExactCurrencyAmount } from 'uniswap/src/features/fiatOnRamp/hooks'
import { FiatCurrencyInfo, FiatOnRampCurrency } from 'uniswap/src/features/fiatOnRamp/types'
import { useLocalizationContext } from 'uniswap/src/features/language/LocalizationContext'
import { usePrevious } from 'utilities/src/react/hooks'
import { DEFAULT_DELAY, useDebounce } from 'utilities/src/time/timing'

const MAX_INPUT_FONT_SIZE = 56
const MIN_INPUT_FONT_SIZE = 32
const MIN_SCREEN_HEIGHT = 667 // iPhone SE 3rd Gen

// if font changes from `fontFamily.sansSerif.regular` or `MAX_INPUT_FONT_SIZE`
// changes from 36 then width value must be adjusted
const MAX_CHAR_PIXEL_WIDTH = 40

const PREDEFINED_AMOUNTS = [100, 300, 1000]

type OnChangeAmount = (amount: string) => void

function OnRampError({ errorText, color }: { errorText?: string; color: ColorTokens }): JSX.Element {
  return (
    <Text color={color} lineHeight={spacing.spacing32} textAlign="center" variant="body3">
      {errorText}
    </Text>
  )
}

interface FiatOnRampAmountSectionProps {
  disabled?: boolean
  value: string
  errorText: string | undefined
  currency: FiatOnRampCurrency
  onEnterAmount: OnChangeAmount
  onChoosePredifendAmount: OnChangeAmount
  quoteAmount: number
  quoteCurrencyAmountReady: boolean
  selectTokenLoading: boolean
  onTokenSelectorPress: () => void
  predefinedAmountsSupported: boolean
  appFiatCurrencySupported: boolean
  notAvailableInThisRegion?: boolean
  fiatCurrencyInfo: FiatCurrencyInfo
  onSelectionChange?: (start: number, end: number) => void
}

export type FiatOnRampAmountSectionRef = {
  textInputRef: RefObject<TextInput>
  triggerShakeAnimation: () => void
}

export const FiatOnRampAmountSection = forwardRef<FiatOnRampAmountSectionRef, FiatOnRampAmountSectionProps>(
  function _FiatOnRampAmountSection(
    {
      disabled,
      value,
      onSelectionChange: selectionChange,
      errorText,
      onEnterAmount,
      onChoosePredifendAmount,
      predefinedAmountsSupported,
      appFiatCurrencySupported,
      notAvailableInThisRegion,
      fiatCurrencyInfo,
      quoteAmount,
      currency,
      selectTokenLoading,
    },
    forwardedRef,
  ): JSX.Element {
    const { t } = useTranslation()
    const isShortMobileDevice = useIsShortMobileDevice()
    const {
      onLayout: onInputLayout,
      fontSize,
      onSetFontSize,
    } = useDynamicFontSizing(MAX_CHAR_PIXEL_WIDTH, MAX_INPUT_FONT_SIZE, MIN_INPUT_FONT_SIZE)
    const prevErrorText = usePrevious(errorText)
    const { fullHeight } = useDeviceDimensions()
    const { hapticFeedback } = useHapticFeedback()

    const inputRef = useRef<TextInput>(null)

    useImperativeHandle(forwardedRef, () => ({
      textInputRef: inputRef,
      triggerShakeAnimation,
    }))

    // This is needed to ensure that the text resizes when modified from outside the component (e.g. custom numpad)
    useEffect(() => {
      if (value) {
        onSetFontSize(value)
        // Always set font size if focused to format placeholder size, we need to pass in a non-empty string to avoid formatting crash
      } else {
        onSetFontSize('0')
      }
    }, [onSetFontSize, value])

    const onSelectionChange = useCallback(
      ({
        nativeEvent: {
          selection: { start, end },
        },
      }: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => selectionChange?.(start, end),
      [selectionChange],
    )

    const inputShakeX = useSharedValue(0)
    const inputAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: inputShakeX.value }],
    }))

    const triggerShakeAnimation = useCallback(() => {
      inputShakeX.value = errorShakeAnimation(inputShakeX)
    }, [inputShakeX])

    useEffect(() => {
      async function shake(): Promise<void> {
        triggerShakeAnimation()
        await hapticFeedback.impact()
      }
      if (errorText && prevErrorText !== errorText) {
        shake().catch(() => undefined)
      }
    }, [errorText, inputShakeX, prevErrorText, triggerShakeAnimation, hapticFeedback])

    // Design has asked to make it around 100ms and DEFAULT_DELAY is 200ms
    const debouncedErrorText = useDebounce(errorText, DEFAULT_DELAY / 2)

    // we want to always focus amount input
    const isTextInputRefActuallyFocused = inputRef.current?.isFocused()
    useFocusEffect(
      useCallback(() => {
        if (!isTextInputRefActuallyFocused) {
          inputRef.current?.focus()
        }
      }, [inputRef, isTextInputRefActuallyFocused]),
    )

    // TODO: handle this fiat mode switcher
    function onToggleIsFiatMode(): void {}

    const formattedCurrencyAmount = useFormatExactCurrencyAmount(
      quoteAmount.toString(),
      currency.currencyInfo?.currency,
    )

    // Workaround to avoid incorrect input width calculations by react-native
    // Decimal numbers were manually calculated for Basel Grotesk fonts and will
    // require an adjustment when the font is changed
    const calculatedInputWidth = [...value].reduce(
      (acc, numStr) => {
        switch (numStr) {
          case '1':
            return acc + fontSize * 0.393
          case '2':
          case '6':
          case '8':
            return acc + fontSize * 0.596
          case '3':
            return acc + fontSize * 0.595
          case '4':
          case '0':
          default:
            return acc + fontSize * 0.62
          case '5':
          case '7':
            return acc + fontSize * 0.602
          case '9':
            return acc + fontSize * 0.607
        }
      },
      // ensures a proper width for a "0" placeholder or adds 3 points for the input caret
      value.length === 0 ? fontSize * 0.62 : 3,
    )

    return (
      <Flex
        alignItems="center"
        gap="$spacing8"
        justifyContent="center"
        style={{ marginTop: (fullHeight - MIN_SCREEN_HEIGHT) / 6 }} // 6 was chosen empirically
        onLayout={onInputLayout}
      >
        <Flex minHeight={spacing.spacing32}>
          {notAvailableInThisRegion ? (
            <OnRampError color="$neutral2" errorText={t('fiatOnRamp.error.unavailable')} />
          ) : debouncedErrorText ? (
            <OnRampError color="$statusCritical" errorText={debouncedErrorText} />
          ) : !appFiatCurrencySupported ? (
            <OnRampError color="$neutral3" errorText={t('fiatOnRamp.error.usd')} />
          ) : null}
        </Flex>
        <AnimatedFlex style={inputAnimatedStyle} width="100%">
          <Flex row alignItems="center" justifyContent="center">
            <Text
              allowFontScaling
              color={!value ? '$neutral3' : '$neutral1'}
              fontSize={fontSize}
              height={fontSize}
              lineHeight={fontSize}
            >
              {fiatCurrencyInfo.symbol}
            </Text>
            <AmountInput
              ref={inputRef}
              adjustWidthToContent
              autoFocus
              alignSelf="stretch"
              backgroundColor="$transparent"
              borderWidth={0}
              disabled={disabled}
              fiatCurrencyInfo={fiatCurrencyInfo}
              fontFamily="$heading"
              fontSize={fontSize}
              fontWeight="$book"
              height={fontSize}
              lineHeight={fontSize + (value ? 5 : 0)}
              maxFontSizeMultiplier={fonts.heading2.maxFontSizeMultiplier}
              minHeight={MAX_INPUT_FONT_SIZE}
              placeholder="0"
              placeholderTextColor="$neutral3"
              px="$none"
              py="$none"
              minWidth={calculatedInputWidth}
              returnKeyType={undefined}
              showSoftInputOnFocus={false}
              textAlign="left"
              value={value}
              onChangeText={onEnterAmount}
              onSelectionChange={onSelectionChange}
            />
          </Flex>
        </AnimatedFlex>
        {!value && predefinedAmountsSupported ? (
          <Flex centered row gap="$spacing12" mt={isShortMobileDevice ? 0 : '$spacing8'} pb="$spacing4">
            {PREDEFINED_AMOUNTS.map((amount) => (
              <PredefinedAmount
                key={amount}
                amount={amount}
                currentAmount={value}
                disabled={notAvailableInThisRegion}
                fiatCurrencyInfo={fiatCurrencyInfo}
                onPress={onChoosePredifendAmount}
              />
            ))}
          </Flex>
        ) : (
          <TouchableArea onPress={onToggleIsFiatMode}>
            <Flex
              centered
              row
              alignItems="center"
              gap="$spacing4"
              justifyContent="center"
              pb="$spacing4"
              pt="$spacing4"
            >
              <Text color="$neutral2" loading={selectTokenLoading} variant="subheading1">
                {formattedCurrencyAmount}
                {currency.currencyInfo?.currency.symbol}
              </Text>
              {/* TODO: support switching from fiat to token amounts */}
              {/* <ArrowUpDown color="$neutral2" maxWidth={16} size="$icon.16" /> */}
            </Flex>
          </TouchableArea>
        )}
      </Flex>
    )
  },
)

// Predefined amount is only supported for certain currencies
function PredefinedAmount({
  amount,
  onPress,
  currentAmount,
  fiatCurrencyInfo,
  disabled,
}: {
  amount: number
  currentAmount: string
  onPress: (amount: string) => void
  fiatCurrencyInfo: FiatCurrencyInfo
  disabled?: boolean
}): JSX.Element {
  const colors = useSporeColors()
  const { addFiatSymbolToNumber } = useLocalizationContext()
  const formattedAmount = addFiatSymbolToNumber({
    value: amount,
    currencyCode: fiatCurrencyInfo.code,
    currencySymbol: fiatCurrencyInfo.symbol,
  })
  const { hapticFeedback } = useHapticFeedback()

  const highlighted = currentAmount === amount.toString()

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={async (): Promise<void> => {
        await hapticFeedback.impact()
        onPress(amount.toString())
      }}
    >
      <Pill
        backgroundColor={!disabled && highlighted ? '$surface2' : '$surface1'}
        customBorderColor={disabled ? colors.surface2.val : colors.surface3.val}
        foregroundColor={colors[disabled ? 'neutral3' : highlighted ? 'neutral1' : 'neutral2'].val}
        label={formattedAmount}
        px="$spacing16"
        textVariant="buttonLabel2"
      />
    </TouchableOpacity>
  )
}