---
title: Fix Keyboard Shortcut Problems
type: troubleshooting
status: first-draft
source_questions: [Q-0087, Q-0340, Q-0341, Q-0342, Q-0343, Q-0344, Q-0345, Q-0346, Q-0347, Q-0348, Q-0349, Q-0350, Q-0351]
verified: 2026-07-22
app_version: 0.8.0
---
# Fix Keyboard Shortcut Problems

Most app shortcuts are single letters that work only when you are not typing, no app window is in front of the workspace, and the current screen supports the requested action. They are designed to do nothing when those conditions are not met.

## A shortcut does nothing while I am typing

Letter shortcuts are paused while your cursor is in:

- a text or number field
- a multiline text area
- a dropdown or selection field
- another editable text area

This prevents a letter in a card title, body text, search, deck description, or other field from unexpectedly changing screens. Finish typing, click a non-editable part of the current screen, then press the shortcut once.

## Shortcuts stop while a window is open

Global navigation shortcuts pause while an app window such as **Recent**, **Settings**, or **Choose a template** is open. The foreground window remains the current task, so a shortcut does not navigate behind it.

Close the window using its visible control, then press the shortcut again. General layered-window and Escape behavior is covered separately from shortcut troubleshooting.

## A letter does not work with Ctrl, Cmd, Alt, or Shift

The global, Card Editor, and deck shortcuts in the main reference are bare letters. Extra modifiers deliberately stop them from running.

For example, use bare **D** to open Decks. **Ctrl+D** or **Cmd+D** is not an app shortcut and may belong to your browser or operating system instead.

The exception is the alternate template-picker combination shown in the navigation: **Cmd+Shift+Y** on macOS or **Meta+Shift+Y** on other platforms. Bare **N** opens the same window and is easier to use consistently.

## Are the shortcuts different on macOS and Windows?

The bare-letter shortcuts are the same. Press **R**, **C**, **D**, **A**, **Q**, **N**, or **S** without Cmd, Ctrl, Alt, or Shift.

Only the alternate template-picker shortcut uses a system modifier. The app calls it **Cmd** on macOS and **Meta** elsewhere. Meta normally means the Windows key or the equivalent system key. If that term or key is unfamiliar, use bare **N** or choose New in the navigation.

## S does not focus search

**S** focuses the main browse search only when the current screen provides one. It works in:

- Cards
- Assets
- the Decks list
- the card-source panel inside an open deck

It does nothing in the Card Editor because that screen has no main browse search. It is also paused while you are already typing in a field or while an app window is open.

## M does not change the card preview

**M** switches between Pan and Rotate only while **Interactive (3D preview)** is active in the Card Editor. It does not turn Interactive preview on for you.

Press **V** to switch from Standard to Interactive preview, then press **M**. The selected Pan or Rotate control should change.

## Deck export shortcuts do nothing

The deck shortcut sequence has two prerequisites:

1. The open deck must contain at least one set so that **Export** is enabled.
2. Press **E** to open the Export menu before pressing **I** for images or **P** for PDF.

**E** does nothing when Export is disabled. **I** and **P** do nothing while the menu is closed. These keys are not deck-export shortcuts on the Decks list or another screen.

## Holding a shortcut key does not repeat the action

A shortcut responds to the first key press and ignores the repeated key signals produced while the key is held. Release the key and press it again if you intentionally want to repeat an action.

This prevents one held key from opening and closing a menu repeatedly or causing several rapid navigation actions.

## Can I change the shortcut keys?

No. Version 0.8.0 provides a small fixed set of shortcuts and does not include shortcut customization in Settings.

Use the matching navigation item, preview control, search field, or Export menu when a supplied key is inconvenient.

## My browser or operating system uses the same keys

The main app shortcuts are bare letters, which avoids most browser combinations. If you add Ctrl, Cmd, Alt, or Shift, the app rejects the bare-letter shortcut and your browser or operating system may handle the combination instead.

If a system-level combination is intercepted, use the equivalent visible app control. For the template picker, bare **N** and New are alternatives to **Cmd+Shift+Y** or **Meta+Shift+Y**.

## Quick recovery checklist

1. Finish typing and move focus out of the editable field.
2. Close any foreground app window.
3. Return to the screen that owns the shortcut.
4. Check that the visible action is available, such as deck Export or Interactive preview.
5. Press the bare letter once without Ctrl, Cmd, Alt, or Shift.
6. If another program still intercepts the key, use the equivalent visible control.

See [Keyboard Shortcuts](../reference/keyboard-shortcuts.md) for the complete reference. Return to the [Troubleshooting Index](./index.md) for another symptom.
