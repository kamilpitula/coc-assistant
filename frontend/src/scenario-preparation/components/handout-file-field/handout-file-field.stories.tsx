import type { Meta, StoryObj } from '@storybook/react-vite'

import { HandoutFileField } from './handout-file-field'

const png = new File(['png'], 'corbitt-house.png', { type: 'image/png' })
const pdf = new File(['pdf'], 'diary-page.pdf', { type: 'application/pdf' })

const meta = {
  title: 'ScenarioPreparation/HandoutFileField',
  component: HandoutFileField,
  args: { family: 'picture', file: null, onChange: () => undefined, inputId: 'file', errorId: 'file-error' },
} satisfies Meta<typeof HandoutFileField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const ChosenImage: Story = { args: { file: png } }

export const ChosenPdf: Story = { args: { family: 'document', file: pdf } }

export const MissingImage: Story = { args: { error: 'Choose an image.' } }

export const WrongTypeForImage: Story = { args: { error: 'Choose a PNG, JPEG, WebP, or GIF image.' } }

export const ImageTooLarge: Story = { args: { error: 'The image is larger than 20 MB. Choose a smaller one.' } }

export const MissingPdf: Story = { args: { family: 'document', error: 'Choose a PDF.' } }

export const WrongTypeForPdf: Story = { args: { family: 'document', error: "This isn't a PDF. Choose a PDF." } }

export const PdfTooLarge: Story = { args: { family: 'document', error: 'The PDF is larger than 20 MB. Choose a smaller one.' } }

export const EditWithCurrentImage: Story = {
  args: { stored: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1_258_291 } },
}

export const EditWithCurrentPdf: Story = {
  args: { family: 'document', stored: { name: 'diary-page.pdf', mediaType: 'application/pdf', sizeBytes: 870_400 } },
}
